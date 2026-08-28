"use client";

import { useEffect } from "react";
import { getTelegramInitData } from "@/lib/telegram/getInitData";

export default function TelegramAuth() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.Telegram?.WebApp) return;

    const initData = getTelegramInitData();
    if (!initData) return;

    void (async () => {
      try {
        const res = await fetch("/api/telegram/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });

        if (!res.ok) {
          console.error("[TelegramAuth] sync failed", await res.text());
          return;
        }

        const data = (await res.json()) as { telegramId: number };
        try {
          // Кэш для мгновенного UI (не используется для авторизации записи —
          // все чувствительные операции заново проверяют initData на сервере).
          localStorage.setItem("tg_user_id", String(data.telegramId));
        } catch (e) {
          console.error("[TelegramAuth] localStorage failed", e);
        }
      } catch (e) {
        console.error("[TelegramAuth] network or unexpected error", e);
      }
    })();
  }, []);

  return null;
}
