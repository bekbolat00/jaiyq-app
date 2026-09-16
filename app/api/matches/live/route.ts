import { after, NextResponse } from "next/server";
import { fetchLiveGame, NotZhaiyqGameError } from "@/lib/kff/liveGame";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncMatchesFromKff } from "@/lib/kff/syncMatches";

export const maxDuration = 60;

/**
 * Сколько секунд CDN Vercel отдаёт один и тот же ответ. Сколько бы
 * болельщиков ни смотрели матч, на KFF уходит не больше одного запроса
 * за этот интервал.
 */
const CDN_TTL_SECONDS = 15;

/** Один прогон синхронизации на инстанс, даже если финал увидели несколько запросов. */
let finalizeInFlight: Promise<unknown> | null = null;

/**
 * Как только KFF объявил финальный свисток, а в `matches` игра ещё не
 * сыграна — подтягиваем результат, составы и события, не дожидаясь
 * ежедневного cron и кнопки админа.
 */
async function finalizeIfNeeded(kffGameId: number) {
  if (finalizeInFlight) return;
  const { data, error } = await getSupabaseAdminClient()
    .from("matches")
    .select("status")
    .eq("kff_game_id", kffGameId)
    .maybeSingle();
  if (error || data?.status === "finished") return;

  finalizeInFlight = syncMatchesFromKff()
    .catch((err) => console.error("[api/matches/live] finalize sync failed", err))
    .finally(() => {
      finalizeInFlight = null;
    });
  await finalizeInFlight;
}

/** Живой счёт матча Жайыка: `GET /api/matches/live?game=<kff_game_id>`. */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("game") ?? "";
  if (!/^\d{1,9}$/.test(raw)) {
    return NextResponse.json({ error: "invalid game id" }, { status: 400 });
  }
  const kffGameId = Number(raw);

  try {
    const state = await fetchLiveGame(kffGameId);
    if (state.phase === "finished") {
      after(() => finalizeIfNeeded(kffGameId));
    }
    return NextResponse.json(state, {
      headers: {
        "Cache-Control": `public, s-maxage=${CDN_TTL_SECONDS}, stale-while-revalidate=${CDN_TTL_SECONDS}`,
      },
    });
  } catch (err) {
    if (err instanceof NotZhaiyqGameError) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    console.error("[api/matches/live] KFF request failed", err);
    return NextResponse.json({ error: "live data unavailable" }, { status: 502 });
  }
}
