import { NextResponse } from "next/server";
import { authenticateTelegramRequest, TelegramAuthError } from "@/lib/telegram/authenticateRequest";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MyTicket, TicketStatus } from "@/lib/types";

type MineBody = { initData?: unknown };

type TicketWithMatch = {
  id: string;
  status: TicketStatus;
  qr_hash: string | null;
  scanned_at: string | null;
  match_id: string;
  match: {
    opponent: string;
    match_date: string;
    is_home: boolean;
    competition: string;
  } | null;
};

/**
 * Билеты текущего пользователя вместе с матчем. Через service-role, а не
 * напрямую из браузера: `tickets` содержат чужие QR-секреты, и открывать
 * таблицу анонимному клиенту нельзя.
 */
export async function POST(request: Request) {
  let body: MineBody;
  try {
    body = (await request.json()) as MineBody;
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

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("tickets")
    .select(
      "id, status, qr_hash, scanned_at, match_id, match:matches(opponent, match_date, is_home, competition)",
    )
    .eq("user_telegram_id", String(user.id))
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api/tickets/mine] select failed", error);
    return NextResponse.json({ error: "load failed" }, { status: 500 });
  }

  const tickets: MyTicket[] = ((data ?? []) as unknown as TicketWithMatch[]).map((t) => ({
    id: t.id,
    status: t.status,
    // QR-секрет отдаём только когда он ещё может пригодиться на входе:
    // у погашенного билета его светить незачем.
    qrHash: t.status === "paid" ? t.qr_hash : null,
    scannedAt: t.scanned_at,
    matchId: t.match_id,
    opponent: t.match?.opponent ?? "Соперник",
    matchDate: t.match?.match_date ?? "",
    isHome: t.match?.is_home ?? true,
    competition: t.match?.competition ?? "",
  }));

  return NextResponse.json({ ok: true, tickets });
}
