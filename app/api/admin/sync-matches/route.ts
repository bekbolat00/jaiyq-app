import { NextResponse } from "next/server";
import { authenticateTelegramRequest, TelegramAuthError } from "@/lib/telegram/authenticateRequest";
import { isAdminTelegramId } from "@/lib/admin/isAdmin";
import { syncMatchesFromKff } from "@/lib/kff/syncMatches";

// Скачивание страниц матчей с KFF может занять десятки секунд.
export const maxDuration = 60;

/** Кнопка «Обновить с KFF» в личном кабинете админа. */
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

  if (!isAdminTelegramId(user.id)) {
    return NextResponse.json({ error: "not allowed" }, { status: 403 });
  }

  try {
    const result = await syncMatchesFromKff();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[api/admin/sync-matches] sync failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "sync failed" },
      { status: 502 },
    );
  }
}
