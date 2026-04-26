import type { DbMatchRow } from "@/lib/types";

/**
 * `rows` — обычно отсортированы по match_date по возрастанию из запроса.
 * Предстоящие дополнительно сортируются по дате (от ближайших), отыгранные — от новых к старым.
 */
export function splitUpcomingAndPast(rows: DbMatchRow[]): {
  upcomingMatches: DbMatchRow[];
  pastMatches: DbMatchRow[];
} {
  const upcomingMatches = rows
    .filter((m) => m.status === "upcoming")
    .sort(
      (a, b) =>
        new Date(a.match_date).getTime() - new Date(b.match_date).getTime(),
    );
  const pastMatches = rows
    .filter((m) => m.status === "finished")
    .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());
  return { upcomingMatches, pastMatches };
}
