import { randomUUID } from "node:crypto";
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
 * Создаёт заявку на билет со статусом "pending" (оплата через Kaspi
 * подтверждается вручную) и сразу выдаёт ему `qr_hash` — секрет, который
 * позже кодируется в QR-код и гасится сканером на входе.
 *
 * Личность подтверждается подписанным Telegram initData — та же схема,
 * что и /api/predictions/submit, /api/rewards/claim: без этого анонимный
 * клиент мог бы вписать произвольный user_telegram_id.
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

  // Один активный билет на матч: повторное нажатие «Купить» не должно
  // плодить заявки, иначе у болельщика окажется пачка QR на один вход.
  const { data: existing, error: existingError } = await admin
    .from("tickets")
    .select("id, status, qr_hash")
    .eq("match_id", body.matchId)
    .eq("user_telegram_id", String(user.id))
    .in("status", ["pending", "paid"])
    .maybeSingle();

  if (existingError) {
    console.error("[api/tickets/purchase] lookup failed", existingError);
    return NextResponse.json({ error: "purchase failed" }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({
      ok: true,
      ticketId: existing.id,
      status: existing.status,
      alreadyExists: true,
    });
  }

  const { data, error } = await admin
    .from("tickets")
    .insert({
      match_id: body.matchId,
      user_telegram_id: String(user.id),
      status: "pending",
      is_used: false,
      qr_hash: randomUUID(),
    })
    .select("id, status")
    .single();

  if (error) {
    console.error("[api/tickets/purchase] insert failed", error);
    return NextResponse.json({ error: "purchase failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ticketId: data.id, status: data.status });
}
