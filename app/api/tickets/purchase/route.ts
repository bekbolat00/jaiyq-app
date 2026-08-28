import { NextResponse } from "next/server";
import { authenticateTelegramRequest, TelegramAuthError } from "@/lib/telegram/authenticateRequest";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type PurchaseTicketBody = {
  initData?: unknown;
  matchId?: unknown;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/**
 * Создаёт заявку на билет со статусом "pending" (ручное подтверждение оплаты
 * через Kaspi). Личность подтверждается подписанным Telegram initData —
 * та же схема, что и /api/predictions/submit, /api/rewards/claim: без этого
 * анонимный клиент мог бы вписать произвольный user_telegram_id.
 */
export async function POST(request: Request) {
  let body: PurchaseTicketBody;
  try {
    body = (await request.json()) as PurchaseTicketBody;
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

  if (!isNonEmptyString(body.matchId)) {
    return NextResponse.json({ error: "invalid ticket payload" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("tickets").insert({
    match_id: body.matchId,
    user_telegram_id: String(user.id),
    status: "pending",
    is_used: false,
  });

  if (error) {
    console.error("[api/tickets/purchase] insert failed", error);
    return NextResponse.json({ error: "purchase failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
