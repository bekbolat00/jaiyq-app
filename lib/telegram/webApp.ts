"use client";

/**
 * Тонкая обёртка над Telegram WebApp SDK (скрипт telegram-web-app.js грузится
 * в app/layout.tsx). Каждый вызов безопасен вне Telegram и на старых клиентах:
 * если метода нет или версия ниже нужной — просто ничего не происходит.
 */

/** Цвет фона приложения — шапка и низ Telegram сливаются с интерфейсом. */
const APP_BACKGROUND = "#050A1C";

function webApp() {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

function atLeast(version: string): boolean {
  const app = webApp();
  return Boolean(app?.isVersionAtLeast?.(version));
}

/** Вызвать один раз при старте: сообщает Telegram, что приложение готово, и разворачивает его. */
export function initTelegramWebApp() {
  const app = webApp();
  if (!app) return;
  app.ready?.();
  app.expand?.();
  if (atLeast("6.1")) {
    app.setHeaderColor?.(APP_BACKGROUND);
    app.setBackgroundColor?.(APP_BACKGROUND);
  }
  if (atLeast("7.10")) app.setBottomBarColor?.(APP_BACKGROUND);
  // Без этого свайп вниз по длинному списку сворачивает всё приложение.
  if (atLeast("7.7")) app.disableVerticalSwipes?.();
}

export function getTelegramBackButton() {
  return atLeast("6.1") ? (webApp()?.BackButton ?? null) : null;
}

/** Тактильный отклик. На Android/iOS в Telegram — вибрация, в браузере — ничего. */
export const haptic = {
  /** Нажатие, переключение. */
  impact(style: "light" | "medium" | "heavy" = "light") {
    if (atLeast("6.1")) webApp()?.HapticFeedback?.impactOccurred(style);
  },
  /** Смена выбранного значения: таб, +/- в пикере. */
  select() {
    if (atLeast("6.1")) webApp()?.HapticFeedback?.selectionChanged();
  },
  /** Итог действия: оплата, прогноз, гол. */
  notify(type: "success" | "error" | "warning") {
    if (atLeast("6.1")) webApp()?.HapticFeedback?.notificationOccurred(type);
  },
};

/**
 * Разрешение боту писать пользователю в личку (нужно для уведомлений).
 * Если пользователь уже разрешал — Telegram сразу вернёт `true` без окна.
 */
export function requestTelegramWriteAccess(): Promise<boolean> {
  const app = webApp();
  if (!app?.requestWriteAccess || !atLeast("6.9")) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      app.requestWriteAccess!((granted) => resolve(Boolean(granted)));
    } catch {
      resolve(false);
    }
  });
}
