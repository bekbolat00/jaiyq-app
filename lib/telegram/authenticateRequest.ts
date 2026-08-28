import { verifyTelegramInitData, type VerifiedTelegramUser } from "./verifyInitData";

export class TelegramAuthError extends Error {}

/**
 * Общая точка входа для всех `app/api/*` route handlers, которым нужна
 * подтверждённая личность пользователя Telegram. Бросает `TelegramAuthError`
 * на любой проблеме — вызывающий код превращает её в HTTP 401.
 */
export function authenticateTelegramRequest(initData: unknown): VerifiedTelegramUser {
  if (typeof initData !== "string" || initData.length === 0) {
    throw new TelegramAuthError("initData is required");
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new TelegramAuthError("TELEGRAM_BOT_TOKEN is not configured on the server");
  }

  try {
    return verifyTelegramInitData(initData, botToken);
  } catch (err) {
    throw new TelegramAuthError((err as Error).message);
  }
}
