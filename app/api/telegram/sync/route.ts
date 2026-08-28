import { NextResponse } from "next/server";
import { authenticateTelegramRequest, TelegramAuthError } from "@/lib/telegram/authenticateRequest";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Подтверждает личность через подписанный `initData` и синхронизирует
 * профиль пользователя в `public.users`. Заменяет прежний прямой upsert
 * с клиента (TelegramAuth.tsx), который доверял неподписанному `initDataUnsafe`.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const initData = (body as { initData?: unknown } | null)?.initData;

  let user;
  try {
    user = authenticateTelegramRequest(initData);
  } catch (err) {
    if (err instanceof TelegramAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("users").upsert(
    [
      {
        telegram_id: user.id,
        username: user.username ?? "",
        first_name: user.firstName ?? "",
        last_name: user.lastName ?? "",
        photo_url: user.photoUrl ?? "",
      },
    ],
    { onConflict: "telegram_id" },
  );

  if (error) {
    console.error("[api/telegram/sync] upsert failed", error);
    return NextResponse.json({ error: "sync failed" }, { status: 500 });
  }

  return NextResponse.json({
    telegramId: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
  });
}
