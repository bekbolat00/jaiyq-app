import { NextResponse } from "next/server";
import { authenticateTelegramRequest, TelegramAuthError } from "@/lib/telegram/authenticateRequest";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ConfirmBody = {
  initData?: unknown;
  ticketId?: unknown;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/**
 * Кнопка «Я оплатил»: переводит собственный билет из `pending` в `paid`.
 *
 * ВАЖНО: это подтверждение со слов пользователя — платёж в Kaspi здесь
 * не проверяется, потому что ссылка на оплату не даёт колбэка. Значит,
 * любой авторизованный пользователь может пометить свой билет оплаченным,
 * не заплатив. Поэтому: (1) действие требует подписанного Telegram
 * initData, чтобы билет был привязан к конкретному человеку и был
 * прослеживаем; (2) обновление ограничено собственным билетом в статусе
 * `pending`. Для настоящей защиты нужна сверка с выпиской Kaspi или
 * их платёжный колбэк — до этого статус `paid` стоит считать
 * «ожидает подтверждения кассиром».
 */
export async function POST(request: Request) {
  let body: ConfirmBody;
  try {
    body = (await request.json()) as ConfirmBody;
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

  if (!isNonEmptyString(body.ticketId)) {
    return NextResponse.json({ error: "invalid ticket payload" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  // Условия в самом UPDATE: чужой билет и уже погашенный (`used`) не
  // тронутся, даже если подставить их id.
  const { data, error } = await admin
    .from("tickets")
    .update({ status: "paid" })
    .eq("id", body.ticketId)
    .eq("user_telegram_id", String(user.id))
    .eq("status", "pending")
    .select("id, status")
    .maybeSingle();

  if (error) {
    console.error("[api/tickets/confirm] update failed", error);
    return NextResponse.json({ error: "confirm failed" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "ticket not found or not pending" },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, status: data.status });
}
