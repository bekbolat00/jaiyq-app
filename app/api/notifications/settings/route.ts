import { NextResponse } from "next/server";
import { authenticateTelegramRequest, TelegramAuthError } from "@/lib/telegram/authenticateRequest";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Body = { initData?: unknown; enabled?: unknown };

/**
 * Подписка на уведомления о матчах.
 * `{ initData }` — прочитать, `{ initData, enabled: true|false }` — изменить.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
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

  if (typeof body.enabled === "boolean") {
    const { data, error } = await admin
      .from("users")
      .update({ notify_matches: body.enabled })
      .eq("telegram_id", user.id)
      .select("notify_matches")
      .maybeSingle();
    if (error) {
      console.error("[api/notifications/settings] update failed", error);
      return NextResponse.json({ error: "update failed" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "user not synced yet" }, { status: 409 });
    return NextResponse.json({ enabled: Boolean(data.notify_matches) });
  }

  const { data, error } = await admin
    .from("users")
    .select("notify_matches")
    .eq("telegram_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("[api/notifications/settings] select failed", error);
    return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  }
  return NextResponse.json({ enabled: Boolean(data?.notify_matches) });
}
