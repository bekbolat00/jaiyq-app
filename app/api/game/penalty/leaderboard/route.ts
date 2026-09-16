import { NextResponse } from "next/server";
import { MissingTableError, scorersLeaderboard } from "@/lib/game/penaltyServer";
import { authenticateTelegramRequest } from "@/lib/telegram/authenticateRequest";

/** Рейтинг «Бомбардиры». `initData` необязателен — без него нет строки «я». */
export async function POST(request: Request) {
  let meId: number | null = null;
  try {
    const body = (await request.json()) as { initData?: unknown };
    if (body?.initData) meId = authenticateTelegramRequest(body.initData).id;
  } catch {
    /* без авторизации отдаём общий топ */
  }
  try {
    return NextResponse.json(await scorersLeaderboard(meId));
  } catch (err) {
    if (err instanceof MissingTableError) return NextResponse.json({ top: [], me: null, total: 0 });
    console.error("[api/game/penalty/leaderboard] failed", err);
    return NextResponse.json({ error: "leaderboard failed" }, { status: 500 });
  }
}
