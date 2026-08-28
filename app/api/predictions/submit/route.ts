import { NextResponse } from "next/server";
import { authenticateTelegramRequest, TelegramAuthError } from "@/lib/telegram/authenticateRequest";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type SubmitPredictionBody = {
  initData?: unknown;
  matchId?: unknown;
  homeScore?: unknown;
  awayScore?: unknown;
  firstGoalPlayer?: unknown;
  firstGoalMinute?: unknown;
  shotsOnTarget?: unknown;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Принимает прогноз "Zhaiyq Эксперт". Раньше `user_id` бралcя из localStorage
 * клиента и писался напрямую в Supabase (спуфится в devtools за секунды).
 * Теперь personality подтверждается подписанным initData, а уникальность
 * (user_id, match_id) закреплена индексом в БД (см. миграцию
 * 20260828120000_match_predictions_unique_constraint.sql).
 */
export async function POST(request: Request) {
  let body: SubmitPredictionBody;
  try {
    body = (await request.json()) as SubmitPredictionBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  let user;
  try {
    user = authenticateTelegramRequest(body.initData);
  } catch (err) {
    if (err instanceof TelegramAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }

  if (
    !isNonEmptyString(body.matchId) ||
    !isFiniteNumber(body.homeScore) ||
    !isFiniteNumber(body.awayScore) ||
    !isNonEmptyString(body.firstGoalPlayer) ||
    !isFiniteNumber(body.firstGoalMinute) ||
    !isFiniteNumber(body.shotsOnTarget)
  ) {
    return NextResponse.json({ error: "invalid prediction payload" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("match_predictions").insert({
    match_id: body.matchId,
    home_score: body.homeScore,
    away_score: body.awayScore,
    first_goal_player: body.firstGoalPlayer,
    first_goal_minute: body.firstGoalMinute,
    shots_on_target: body.shotsOnTarget,
    user_id: String(user.id),
  });

  if (error) {
    // 23505 = unique_violation — пользователь уже прогнозировал этот матч.
    if (error.code === "23505") {
      return NextResponse.json({ error: "already predicted" }, { status: 409 });
    }
    console.error("[api/predictions/submit] insert failed", error);
    return NextResponse.json({ error: "submit failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
