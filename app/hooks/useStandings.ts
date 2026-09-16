"use client";

import { useEffect, useState } from "react";
import type { Standings } from "@/lib/kff/standings";

export type StandingsState =
  | { status: "loading"; data: null }
  | { status: "ok"; data: Standings }
  | { status: "error"; data: null; retry: () => void };

/** Живая турнирная таблица с KFF через `/api/standings`. */
export function useStandings(): StandingsState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<StandingsState>({ status: "loading", data: null });

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- перезапрос по кнопке «Повторить»
    setState({ status: "loading", data: null });
    fetch("/api/standings")
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as Standings;
      })
      .then((data) => {
        if (!cancelled) setState({ status: "ok", data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", data: null, retry: () => setAttempt((a) => a + 1) });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return state;
}
