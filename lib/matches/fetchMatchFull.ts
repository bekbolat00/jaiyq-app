import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type {
  DbMatchWithRelations,
  DbTeamRow,
  DbMatchRow,
  DbPlayerRow,
} from "@/lib/types";

/** Соответствует вложенной загрузке для матч-центра. */
/** Как в ТЗ: вложенные `match_events`, `match_stats`, `match_lineups` с `players`. */
export const MATCH_WITH_RELATIONS_SELECT = [
  "*",
  "match_events(*)",
  "match_stats(*)",
  "match_lineups(player:players(*))",
].join(", ");

export type MatchFullFetch = {
  match: DbMatchWithRelations | null;
  teams: DbTeamRow[];
  error: Error | null;
};

/**
 * Матч со всеми вложенными сущностями + `teams` по `team_id` из статистики и заявок.
 */
export async function fetchMatchWithRelationsById(
  matchId: string,
): Promise<MatchFullFetch> {
  if (!isSupabaseConfigured() || !matchId.trim()) {
    return { match: null, teams: [], error: new Error("Supabase не настроен") };
  }

  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_WITH_RELATIONS_SELECT)
    .eq("id", matchId)
    .maybeSingle();

  if (error) {
    return { match: null, teams: [], error: new Error(error.message) };
  }

  if (!data) {
    return { match: null, teams: [], error: new Error("Матч не найден") };
  }

  const match = data as unknown as DbMatchWithRelations;
  const lineups = match.match_lineups ?? [];
  const stats = match.match_stats ?? [];
  const teamIdSet = new Set<string>();
  for (const l of lineups) {
    if (l.team_id) teamIdSet.add(l.team_id);
  }
  for (const s of stats) {
    if (s.team_id) teamIdSet.add(s.team_id);
  }

  const teamIds = [...teamIdSet];
  let teams: DbTeamRow[] = [];
  if (teamIds.length) {
    const t = await supabase.from("teams").select("*").in("id", teamIds);
    if (t.error) {
      return { match, teams: [], error: new Error(t.error.message) };
    }
    teams = (t.data ?? []) as DbTeamRow[];
  }

  return { match, teams, error: null };
}

/** Составы из `public.players` для двух команд. */
export async function fetchPlayersForMatchTeams(
  homeTeamId: string,
  awayTeamId: string,
): Promise<{ data: DbPlayerRow[]; error: Error | null }> {
  if (!isSupabaseConfigured() || !homeTeamId || !awayTeamId) {
    return { data: [], error: new Error("Supabase не настроен или team_id") };
  }
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .in("team_id", [homeTeamId, awayTeamId]);
  if (error) {
    return { data: [], error: new Error(error.message) };
  }
  return { data: (data ?? []) as DbPlayerRow[], error: null };
}

/** Краткие прошедшие матчи (для вкладки «последние матчи»), без вложенностей. */
export async function fetchRecentFinishedMatches(
  excludeMatchId: string,
  limit: number = 5,
): Promise<DbMatchRow[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "finished")
    .neq("id", excludeMatchId)
    .order("match_date", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as DbMatchRow[];
}

type PredictionRow = { home_score: number | null; away_score: number | null };
type PredictionsStats = { count: number; avgHome: number | null; avgAway: number | null };

export async function fetchPredictionsStatsForMatch(
  matchId: string,
): Promise<PredictionsStats> {
  if (!isSupabaseConfigured()) {
    return { count: 0, avgHome: null, avgAway: null };
  }
  const { data, error } = await supabase
    .from("match_predictions")
    .select("home_score, away_score")
    .eq("match_id", matchId);

  if (error || !data?.length) {
    return { count: 0, avgHome: null, avgAway: null };
  }
  const rows = data as PredictionRow[];
  let h = 0;
  let a = 0;
  let c = 0;
  for (const r of rows) {
    if (r.home_score == null && r.away_score == null) continue;
    c += 1;
    h += r.home_score ?? 0;
    a += r.away_score ?? 0;
  }
  if (c === 0) {
    return { count: 0, avgHome: null, avgAway: null };
  }
  return {
    count: rows.length,
    avgHome: h / c,
    avgAway: a / c,
  };
}
