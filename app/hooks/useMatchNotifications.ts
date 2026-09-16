"use client";

import { useCallback, useEffect, useState } from "react";
import { getTelegramInitData } from "@/lib/telegram/getInitData";
import { haptic, requestTelegramWriteAccess } from "@/lib/telegram/webApp";

export type MatchNotificationsState = {
  /** null — ещё не знаем (загрузка или открыто не в Telegram). */
  enabled: boolean | null;
  busy: boolean;
  /** Открыто вне Telegram — подписаться нельзя. */
  unavailable: boolean;
  error: string | null;
  setEnabled: (next: boolean) => Promise<void>;
};

async function callSettings(initData: string, enabled?: boolean): Promise<boolean> {
  const res = await fetch("/api/notifications/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(enabled === undefined ? { initData } : { initData, enabled }),
  });
  if (res.status === 503) throw new Error("not-configured");
  if (!res.ok) throw new Error(String(res.status));
  return ((await res.json()) as { enabled: boolean }).enabled;
}

/**
 * Подписка на уведомления о матчах от бота. Включение сначала спрашивает у
 * Telegram разрешение боту писать пользователю — без него сообщения не дойдут.
 */
export function useMatchNotifications(): MatchNotificationsState {
  const [enabled, setEnabledState] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initData = getTelegramInitData();
    if (!initData) {
      // Вне Telegram подписка недоступна — это известно только на клиенте.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnavailable(true);
      return;
    }
    let cancelled = false;
    callSettings(initData)
      .then((v) => {
        if (!cancelled) setEnabledState(v);
      })
      .catch(() => {
        if (!cancelled) setEnabledState(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setEnabled = useCallback(async (next: boolean) => {
    const initData = getTelegramInitData();
    if (!initData) {
      setUnavailable(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (next) {
        const granted = await requestTelegramWriteAccess();
        if (!granted) {
          setError("Разрешите боту присылать сообщения, чтобы получать уведомления.");
          haptic.notify("warning");
          return;
        }
      }
      setEnabledState(await callSettings(initData, next));
      haptic.notify(next ? "success" : "warning");
    } catch (e) {
      setError(
        e instanceof Error && e.message === "not-configured"
          ? "Уведомления скоро заработают — клуб завершает настройку."
          : "Не удалось сохранить. Попробуйте ещё раз.",
      );
      haptic.notify("error");
    } finally {
      setBusy(false);
    }
  }, []);

  return { enabled, busy, unavailable, error, setEnabled };
}
