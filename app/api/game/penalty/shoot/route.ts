import { NextResponse } from "next/server";
import { KEEPER_LEVELS, sanitizeInput, type KeeperLevel, type ShotInput } from "@/lib/game/penalty";
import { MissingTableError, takeShot } from "@/lib/game/penaltyServer";
import { authenticateTelegramRequest, TelegramAuthError } from "@/lib/telegram/authenticateRequest";

/**
 * Удар: `POST { initData, input: { kind, shape, aimX, aimY, power, curve }, mode, level }`.
 * Клиент присылает только параметры свайпа — гол или сейв решает сервер.
 */
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

  const input = sanitizeInput((body.input ?? {}) as Partial<ShotInput>);
  if (!input) return NextResponse.json({ error: "invalid shot" }, { status: 400 });

  try {
    const mode = body.mode === "freekick" ? "freekick" : "penalty";
    // Уровень вратаря влияет на исход и награду — доверять клиенту нельзя, проверяем список.
    const level = KEEPER_LEVELS.includes(body.level as KeeperLevel) ? (body.level as KeeperLevel) : "amateur";
    const res = await takeShot(user.id, input, mode, level);
    if (!res.ok) {
      return NextResponse.json(
        { error: res.reason },
        { status: res.reason === "no-attempts" ? 429 : 409 },
      );
    }
    return NextResponse.json(res);
  } catch (err) {
    if (err instanceof MissingTableError) return NextResponse.json({ error: "not configured" }, { status: 503 });
    console.error("[api/game/penalty/shoot] failed", err);
    return NextResponse.json({ error: "shot failed" }, { status: 500 });
  }
}
