import type { DbMatchRow } from "@/lib/types";

/**
 * `rows` — уже отсортированы по match_date по возрастанию.
 * Возвращает предстоящие в том же порядке и отыгранные от новых к старым.
 */
export function splitUpcomingAndPast(rows: DbMatchRow[]): {
  upcomingMatches: DbMatchRow[];
  pastMatches: DbMatchRow[];
} {
  const upcomingMatches = rows.filter((m) => m.status === "upcoming");
  const pastMatches = rows
    .filter((m) => m.status === "finished")
    .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());
  return { upcomingMatches, pastMatches };
}
