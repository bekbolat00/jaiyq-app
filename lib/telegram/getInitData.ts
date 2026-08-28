"use client";

/** Читает подписанный initData из Telegram WebApp SDK. Безопасен для клиентских компонентов. */
export function getTelegramInitData(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.Telegram?.WebApp?.initData;
  return raw && raw.length > 0 ? raw : null;
}
