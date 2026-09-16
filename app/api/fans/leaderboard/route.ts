import { NextResponse } from "next/server";
import { authenticateTelegramRequest } from "@/lib/telegram/authenticateRequest";
import { computeLeaderboard, type LeaderboardRow, type LeaderboardTable } from "@/lib/fans/leaderboard";

const TOP_LIMIT = 20;
const CACHE_TTL_MS = 60_000;

let cache: { at: number; table: LeaderboardTable } | null = null;
let inflight: Promise<LeaderboardTable> | null = null;

async function getTable(): Promise<LeaderboardTable> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.table;
  if (!inflight) {
    inflight = computeLeaderboard()
      .then((table) => {
        cache = { at: Date.now(), table };
        return table;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

function toRow(row: LeaderboardTable["rows"][number], meId: string | null): LeaderboardRow {
  return {
    place: row.place,
    name: row.name,
    photoUrl: row.photoUrl,
    points: row.points,
    predictions: row.predictions,
    exact: row.exact,
    isMe: meId !== null && row.userId === meId,
  };
}

/**
 * Рейтинг болельщиков по прогнозам. initData необязателен: без него (или с
 * невалидным) отдаём только топ, с ним — ещё и строку текущего пользователя.
 */
export async function POST(request: Request) {
  let initData: unknown;
  try {
    initData = ((await request.json()) as { initData?: unknown } | null)?.initData;
  } catch {
    initData = undefined;
  }

  let meId: string | null = null;
  if (typeof initData === "string" && initData.length > 0) {
    try {
      meId = String(authenticateTelegramRequest(initData).id);
    } catch {
      meId = null;
    }
  }

  let table: LeaderboardTable;
  try {
    table = await getTable();
  } catch (err) {
    console.error("[api/fans/leaderboard] compute failed", err);
    return NextResponse.json({ error: "leaderboard unavailable" }, { status: 500 });
  }

  const meIndex = meId ? table.rows.findIndex((r) => r.userId === meId) : -1;
  const meRow = meIndex >= 0 ? table.rows[meIndex] : undefined;
  // Ближайшее место выше моего — для подписи «До N-го места — K очков».
  const aheadRow = meRow ? table.rows.slice(0, meIndex).findLast((r) => r.place < meRow.place) : undefined;

  return NextResponse.json({
    top: table.rows.slice(0, TOP_LIMIT).map((r) => toRow(r, meId)),
    me: meRow ? toRow(meRow, meId) : null,
    ahead: aheadRow ? { place: aheadRow.place, points: aheadRow.points } : null,
    totalFans: table.rows.length,
    scoredMatches: table.scoredMatches,
  });
}
