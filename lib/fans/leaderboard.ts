import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { POINTS_EXACT, fanDisplayName, rankFans, scorePrediction, type FanTotals } from "./scoring";

export { SCORING_RULES, scorePrediction, rankFans, fanDisplayName } from "./scoring";
export type { Score, FanTotals, RankedFan } from "./scoring";

/** Строка рейтинга, как её видит клиент. Telegram id и username наружу не уходят. */
export type LeaderboardRow = {
  place: number;
  name: string;
  photoUrl: string | null;
  points: number;
  predictions: number;
  exact: number;
  isMe: boolean;
};

export type LeaderboardTable = {
  /** Внутренний список: строка + userId для поиска «меня». */
  rows: (Omit<LeaderboardRow, "isMe"> & { userId: string })[];
  scoredMatches: number;
};

type MatchRow = {
  id: string;
  is_home: boolean | null;
  zhaiyq_score: number | null;
  opponent_score: number | null;
};

type PredictionRow = {
  user_id: string;
  match_id: string;
  home_score: number | null;
  away_score: number | null;
};

type UserRow = {
  telegram_id: number | string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
};

const PAGE = 1000;
const IN_CHUNK = 200;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function loadPredictions(matchIds: string[]): Promise<PredictionRow[]> {
  const admin = getSupabaseAdminClient();
  const all: PredictionRow[] = [];
  for (const ids of chunk(matchIds, IN_CHUNK)) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin
        .from("match_predictions")
        .select("user_id, match_id, home_score, away_score")
        .in("match_id", ids)
        .order("user_id", { ascending: true })
        .order("match_id", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) {
        // 42703 = undefined_column: миграция со счётом прогноза
        // (20260426120000_match_predictions_scores.sql) ещё не применена — считать нечего.
        if (error.code === "42703") {
          console.warn("[fans/leaderboard] match_predictions has no score columns yet", error.message);
          return [];
        }
        throw new Error(`match_predictions: ${error.message}`);
      }
      const rows = (data ?? []) as PredictionRow[];
      all.push(...rows);
      if (rows.length < PAGE) break;
    }
  }
  return all;
}

async function loadUsers(userIds: string[]): Promise<Map<string, UserRow>> {
  const admin = getSupabaseAdminClient();
  const byId = new Map<string, UserRow>();
  const numericIds = userIds.filter((id) => /^\d+$/.test(id));
  for (const ids of chunk(numericIds, IN_CHUNK)) {
    const { data, error } = await admin
      .from("users")
      .select("telegram_id, username, first_name, last_name, photo_url")
      .in("telegram_id", ids);
    if (error) throw new Error(`users: ${error.message}`);
    for (const u of (data ?? []) as UserRow[]) byId.set(String(u.telegram_id), u);
  }
  return byId;
}

/** Считает полный рейтинг по завершённым матчам (service-role, обходит RLS). */
export async function computeLeaderboard(): Promise<LeaderboardTable> {
  const admin = getSupabaseAdminClient();
  const { data: matchData, error: matchErr } = await admin
    .from("matches")
    .select("id, is_home, zhaiyq_score, opponent_score")
    .eq("status", "finished")
    .not("zhaiyq_score", "is", null)
    .not("opponent_score", "is", null);
  if (matchErr) throw new Error(`matches: ${matchErr.message}`);

  const matches = (matchData ?? []) as MatchRow[];
  if (matches.length === 0) return { rows: [], scoredMatches: 0 };

  // Фактический счёт в порядке хозяева–гости — как хранится прогноз.
  const actualByMatch = new Map(
    matches.map((m) => {
      const z = m.zhaiyq_score as number;
      const o = m.opponent_score as number;
      return [m.id, m.is_home === false ? { home: o, away: z } : { home: z, away: o }] as const;
    }),
  );

  const predictions = await loadPredictions([...actualByMatch.keys()]);
  const totals = new Map<string, FanTotals>();
  const matchesWithPredictions = new Set<string>();

  for (const p of predictions) {
    const actual = actualByMatch.get(p.match_id);
    if (!actual || p.home_score == null || p.away_score == null || !p.user_id) continue;
    const pts = scorePrediction({ home: p.home_score, away: p.away_score }, actual);
    const t = totals.get(p.user_id) ?? { userId: p.user_id, points: 0, predictions: 0, exact: 0 };
    t.points += pts;
    t.predictions += 1;
    if (pts === POINTS_EXACT) t.exact += 1;
    totals.set(p.user_id, t);
    matchesWithPredictions.add(p.match_id);
  }

  const ranked = rankFans([...totals.values()]);
  const users = await loadUsers(ranked.map((r) => r.userId));

  return {
    scoredMatches: matchesWithPredictions.size,
    rows: ranked.map((r) => {
      const u = users.get(r.userId);
      return {
        userId: r.userId,
        place: r.place,
        name: u ? fanDisplayName(u) : "Болельщик",
        photoUrl: u?.photo_url?.trim() || null,
        points: r.points,
        predictions: r.predictions,
        exact: r.exact,
      };
    }),
  };
}
