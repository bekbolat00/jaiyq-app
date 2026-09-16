import { NextResponse } from "next/server";
import { authenticateTelegramRequest, TelegramAuthError } from "@/lib/telegram/authenticateRequest";
import { isAdminTelegramId } from "@/lib/admin/isAdmin";

/** Нужно ли показывать админские инструменты в личном кабинете. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  let user;
  try {
    user = authenticateTelegramRequest((body as { initData?: unknown } | null)?.initData);
  } catch (err) {
    if (err instanceof TelegramAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }

  return NextResponse.json({ isAdmin: isAdminTelegramId(user.id) });
}
