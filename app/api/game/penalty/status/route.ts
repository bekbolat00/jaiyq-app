import { NextResponse } from "next/server";
import { getPenaltyStatus, MissingTableError } from "@/lib/game/penaltyServer";
import { authenticateTelegramRequest, TelegramAuthError } from "@/lib/telegram/authenticateRequest";

/** Попытки на сегодня и сумма очков игрока: `POST { initData }`. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  let user;
  try {
    user = authenticateTelegramRequest(body.initData);
  } catch (err) {
    if (err instanceof TelegramAuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
  try {
    return NextResponse.json(await getPenaltyStatus(user.id));
  } catch (err) {
    if (err instanceof MissingTableError) return NextResponse.json({ error: "not configured" }, { status: 503 });
    console.error("[api/game/penalty/status] failed", err);
    return NextResponse.json({ error: "status failed" }, { status: 500 });
  }
}
