import { NextResponse } from "next/server";
import { authenticateTelegramRequest, TelegramAuthError } from "@/lib/telegram/authenticateRequest";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ScanBody = {
  initData?: unknown;
  qrHash?: unknown;
};

/** Что стюард увидит на экране. */
export type ScanResult =
  | { result: "ok"; opponent: string; matchDate: string; scannedAt: string }
  | { result: "already_used"; opponent: string; scannedAt: string | null }
  | { result: "not_paid" }
  | { result: "not_found" };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/**
 * Проверяет `stewards` ли это. Список разрешённых Telegram-id задаётся
 * переменной STEWARD_TELEGRAM_IDS ("111,222"). Если она не задана —
 * сканер работает в тестовом режиме: пускает любого авторизованного
 * пользователя. Перед проходом на реальный матч переменную нужно
 * заполнить, иначе любой болельщик сможет гасить чужие билеты.
 */
function isSteward(telegramId: string): boolean {
  const raw = process.env.STEWARD_TELEGRAM_IDS?.trim();
  if (!raw) return true;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(telegramId);
}

export async function POST(request: Request) {
  let body: ScanBody;
  try {
    body = (await request.json()) as ScanBody;
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

  if (!isSteward(String(user.id))) {
    return NextResponse.json({ error: "not allowed" }, { status: 403 });
  }

  if (!isNonEmptyString(body.qrHash)) {
    return NextResponse.json({ error: "invalid qr payload" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const scannedAt = new Date().toISOString();

  // Гашение одним условным UPDATE (`status = 'paid'` внутри самого
  // запроса) — это и есть защита от двойного прохода: если два стюарда
  // считают один QR одновременно, Postgres пропустит только первый,
  // второй получит 0 строк и увидит «уже использован». Сначала прочитать,
  // а потом записать было бы гонкой.
  const { data: burned, error: burnError } = await admin
    .from("tickets")
    .update({ status: "used", is_used: true, scanned_at: scannedAt })
    .eq("qr_hash", body.qrHash)
    .eq("status", "paid")
    .select("id, match:matches(opponent, match_date)")
    .maybeSingle();

  if (burnError) {
    console.error("[api/tickets/scan] update failed", burnError);
    return NextResponse.json({ error: "scan failed" }, { status: 500 });
  }

  if (burned) {
    const match = burned.match as unknown as
      | { opponent: string; match_date: string }
      | null;
    return NextResponse.json({
      result: "ok",
      opponent: match?.opponent ?? "",
      matchDate: match?.match_date ?? "",
      scannedAt,
    } satisfies ScanResult);
  }

  // Прохода не случилось — разбираемся, почему именно, чтобы стюард
  // видел разницу между «подделка» и «уже заходил».
  const { data: found, error: findError } = await admin
    .from("tickets")
    .select("status, scanned_at, match:matches(opponent)")
    .eq("qr_hash", body.qrHash)
    .maybeSingle();

  if (findError) {
    console.error("[api/tickets/scan] lookup failed", findError);
    return NextResponse.json({ error: "scan failed" }, { status: 500 });
  }

  if (!found) {
    return NextResponse.json({ result: "not_found" } satisfies ScanResult);
  }

  if (found.status === "used") {
    const match = found.match as unknown as { opponent: string } | null;
    return NextResponse.json({
      result: "already_used",
      opponent: match?.opponent ?? "",
      scannedAt: found.scanned_at,
    } satisfies ScanResult);
  }

  return NextResponse.json({ result: "not_paid" } satisfies ScanResult);
}
