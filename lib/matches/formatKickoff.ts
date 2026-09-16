/**
 * Подпись времени начала матча для людей: «Сегодня, 16:00», «Завтра, 16:00»,
 * «Пт, 9 октября · 16:00». `match_date` хранится без часового пояса и уже
 * в местном времени Казахстана, поэтому парсится как локальное время.
 */
export function formatKickoff(matchDate: string, now: Date = new Date()): string {
  const d = new Date(matchDate);
  if (Number.isNaN(d.getTime())) return "";

  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const dayDiff = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86_400_000,
  );

  if (dayDiff === 0) return `Сегодня, ${time}`;
  if (dayDiff === 1) return `Завтра, ${time}`;

  const weekday = d.toLocaleDateString("ru-RU", { weekday: "short" });
  const date = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${date} · ${time}`;
}

/** Заголовок пары в порядке «хозяева — гости». */
export function matchTitle(row: { is_home: boolean; opponent: string }): string {
  return row.is_home ? `Жайык — ${row.opponent}` : `${row.opponent} — Жайык`;
}
