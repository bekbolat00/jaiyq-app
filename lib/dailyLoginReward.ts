/** Локальная календарная дата YYYY-MM-DD (часовой пояс пользователя). */
export function localDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ymdToLocalDate(ymd: string): Date {
  const [y, mo, da] = ymd.split("-").map(Number);
  return new Date(y, mo - 1, da);
}

/** Разница в календарных днях между двумя YYYY-MM-DD (a раньше b → отрицательная). */
export function calendarDaysBetween(aYmd: string, bYmd: string): number {
  const a = ymdToLocalDate(aYmd).getTime();
  const b = ymdToLocalDate(bYmd).getTime();
  return Math.round((b - a) / 86400000);
}

/**
 * Серия входов: +1 к вчерашнему дню, иначе сброс в 1.
 * lastYmd — предыдущее last_login_date (только дата) или null.
 */
export function nextLoginStreak(lastYmd: string | null, todayYmd: string, prevStreak: number): number {
  if (!lastYmd) return 1;
  const diff = calendarDaysBetween(lastYmd, todayYmd);
  if (diff === 1) return Math.max(1, prevStreak) + 1;
  return 1;
}

export function normalizedLoginDate(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).slice(0, 10);
  if (s.length !== 10) return null;
  return s;
}
