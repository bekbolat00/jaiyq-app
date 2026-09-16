/**
 * Админы приложения — Telegram-id из ADMIN_TELEGRAM_IDS ("111,222").
 * В отличие от списка стюардов, пустая переменная НЕ открывает доступ:
 * админские действия пишут в базу, и «тестовый режим для всех» тут опасен.
 */
export function isAdminTelegramId(telegramId: number | string): boolean {
  const raw = process.env.ADMIN_TELEGRAM_IDS?.trim();
  if (!raw) return false;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(String(telegramId));
}
