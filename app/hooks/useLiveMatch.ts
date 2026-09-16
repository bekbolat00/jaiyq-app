"use client";

import { haptic } from "@/lib/telegram/webApp";
import { useEffect, useRef, useState } from "react";
import type { LiveGameState } from "@/lib/kff/liveGame";
import type { DbMatchRow } from "@/lib/types";

const POLL_MS = 20_000;
/** Начинаем спрашивать чуть раньше стартового свистка — KFF может начать трансляцию досрочно. */
const WINDOW_BEFORE_MS = 10 * 60_000;
/** С учётом перерыва, добавленного времени и возможных пенальти. */
const WINDOW_AFTER_MS = 3.5 * 60 * 60_000;
/** Сервер подтягивает итог матча в фоне — даём ему время, прежде чем перечитать список. */
const REFETCH_AFTER_FINISH_MS = 25_000;

function zhaiyqGoals(state: LiveGameState, zhaiyqIsHome: boolean): number {
  return (zhaiyqIsHome ? state.homeScore : state.awayScore) ?? 0;
}

function inLiveWindow(row: DbMatchRow, now: number): boolean {
  const kickoff = new Date(row.match_date).getTime();
  return now >= kickoff - WINDOW_BEFORE_MS && now <= kickoff + WINDOW_AFTER_MS;
}

/**
 * Живой счёт предстоящего матча. Опрашивает `/api/matches/live` только
 * в окне вокруг стартового свистка и только пока приложение на экране,
 * так что в обычные дни не делает ни одного запроса.
 */
export function useLiveMatch(row: DbMatchRow, onFinished?: () => void): LiveGameState | null {
  const [state, setState] = useState<LiveGameState | null>(null);
  const onFinishedRef = useRef(onFinished);
  const prevGoalsRef = useRef<number | null>(null);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const kffGameId = row.status === "upcoming" ? (row.kff_game_id ?? null) : null;

  useEffect(() => {
    if (kffGameId == null) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let finishTimer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = setTimeout(tick, POLL_MS);
    };

    async function tick() {
      if (cancelled) return;
      if (document.visibilityState !== "visible" || !inLiveWindow(row, Date.now())) {
        schedule();
        return;
      }
      try {
        const res = await fetch(`/api/matches/live?game=${kffGameId}`);
        if (res.ok) {
          const next = (await res.json()) as LiveGameState;
          if (cancelled) return;
          // Гол Жайыка — короткая вибрация. Сравниваем с прошлым ответом, чтобы
          // не вибрировать при первом открытии уже идущего матча.
          if (prevGoalsRef.current != null && zhaiyqGoals(next, row.is_home) > prevGoalsRef.current) {
            haptic.notify("success");
          }
          prevGoalsRef.current = zhaiyqGoals(next, row.is_home);
          setState(next.phase === "upcoming" ? null : next);
          if (next.phase === "finished") {
            finishTimer ??= setTimeout(() => onFinishedRef.current?.(), REFETCH_AFTER_FINISH_MS);
            return; // финальный свисток — больше не опрашиваем
          }
        }
      } catch {
        /* сеть моргнула — попробуем на следующем тике */
      }
      schedule();
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };

    void tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (finishTimer) clearTimeout(finishTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // row.match_date — единственное, что tick берёт из row помимо kffGameId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kffGameId, row.match_date]);

  return state;
}
