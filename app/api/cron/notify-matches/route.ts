import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runMatchNotifications } from "@/lib/notifications/matchNotifications";

export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Уведомления о матчах. Вызывать каждые 5 минут (cron-job.org или pg_cron):
 * `GET /api/cron/notify-matches` с `Authorization: Bearer $CRON_SECRET`.
 *
 * `?dry=1` — ничего не отправлять, только показать, что ушло бы;
 * `?now=2026-09-17T15:00:00+05:00` — проверить окно на выбранный момент
 * (только вместе с `dry=1`). Локально (`next dev`) dry-run доступен без секрета.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const dryRun = params.get("dry") === "1";
  const devDry = dryRun && process.env.NODE_ENV === "development";
  if (!isAuthorized(request) && !devDry) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const nowParam = params.get("now");
  const nowMs = dryRun && nowParam ? new Date(nowParam).getTime() : Date.now();
  if (!Number.isFinite(nowMs)) {
    return NextResponse.json({ error: "invalid now" }, { status: 400 });
  }

  try {
    return NextResponse.json(await runMatchNotifications(nowMs, dryRun));
  } catch (err) {
    console.error("[api/cron/notify-matches] failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
