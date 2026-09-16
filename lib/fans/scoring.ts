/**
 * Чистые функции рейтинга болельщиков: очки за прогноз, сортировка и места.
 * Без зависимостей — используются и на сервере (`leaderboard.ts`), и в проверках.
 */

export type Score = { home: number; away: number };

export const POINTS_EXACT = 5;
export const POINTS_OUTCOME_AND_DIFF = 3;
export const POINTS_OUTCOME = 2;

/** Короткие правила для экрана «Как считаются очки». */
export const SCORING_RULES: readonly { points: number; title: string }[] = [
  { points: POINTS_EXACT, title: "Точный счёт" },
  { points: POINTS_OUTCOME_AND_DIFF, title: "Исход и разница мячей" },
  { points: POINTS_OUTCOME, title: "Только исход матча" },
  { points: 0, title: "Исход не угадан" },
];

/**
 * Очки за один прогноз. Оба счёта — в одном порядке (хозяева–гости),
 * поэтому исход и разница мячей сравниваются напрямую.
 */
export function scorePrediction(predicted: Score, actual: Score): number {
  if (predicted.home === actual.home && predicted.away === actual.away) return POINTS_EXACT;
  const pDiff = predicted.home - predicted.away;
  const aDiff = actual.home - actual.away;
  if (Math.sign(pDiff) !== Math.sign(aDiff)) return 0;
  return pDiff === aDiff ? POINTS_OUTCOME_AND_DIFF : POINTS_OUTCOME;
}

export type FanTotals = {
  /** Telegram id строкой — только для сервера, наружу не отдаётся. */
  userId: string;
  points: number;
  predictions: number;
  exact: number;
};

export type RankedFan = FanTotals & { place: number };

function compareUserId(a: string, b: string): number {
  // Telegram id — число; сравниваем по длине, затем лексикографически (без потерь на bigint).
  if (a.length !== b.length) return a.length - b.length;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Сортировка: очки ↓, точные счёта ↓, прогнозов ↑ (меньше попыток — выше),
 * затем telegram id ↑ для детерминизма. Одинаковые очки/точные/прогнозы
 * делят место (1, 2, 2, 4).
 */
export function rankFans(totals: readonly FanTotals[]): RankedFan[] {
  const sorted = [...totals].sort(
    (a, b) =>
      b.points - a.points ||
      b.exact - a.exact ||
      a.predictions - b.predictions ||
      compareUserId(a.userId, b.userId),
  );
  const ranked: RankedFan[] = [];
  sorted.forEach((fan, i) => {
    const prev = ranked[i - 1];
    const tied =
      prev &&
      prev.points === fan.points &&
      prev.exact === fan.exact &&
      prev.predictions === fan.predictions;
    ranked.push({ ...fan, place: tied ? prev.place : i + 1 });
  });
  return ranked;
}

/** «Бекболат Б.» → «@username» → «Болельщик». */
export function fanDisplayName(u: {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
}): string {
  const first = u.first_name?.trim();
  if (first) {
    const lastInitial = u.last_name?.trim().charAt(0);
    return lastInitial ? `${first} ${lastInitial.toUpperCase()}.` : first;
  }
  const username = u.username?.trim();
  if (username) return `@${username}`;
  return "Болельщик";
}
