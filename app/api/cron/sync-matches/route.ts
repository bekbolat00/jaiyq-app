import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { syncMatchesFromKff } from "@/lib/kff/syncMatches";

export const maxDuration = 60;

/**
 * Проверка секрета планировщика. Vercel Cron сам шлёт
 * `Authorization: Bearer $CRON_SECRET`; внешний планировщик (cron-job.org,
 * pg_cron в Supabase) должен слать такой же заголовок.
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Автоматическая синхронизация матчей с kffleague.kz по расписанию. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncMatchesFromKff();
    const failed = result.games.filter((g) => g.action === "failed");
    if (failed.length) console.error("[api/cron/sync-matches] failed games", failed);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[api/cron/sync-matches] sync failed", err);
    return NextResponse.json({ error: "sync failed" }, { status: 502 });
  }
}
