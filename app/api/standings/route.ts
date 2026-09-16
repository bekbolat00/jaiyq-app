import { NextResponse } from "next/server";
import { fetchStandings } from "@/lib/kff/standings";

/** Живая турнирная таблица с kffleague.kz. */
export async function GET() {
  try {
    const standings = await fetchStandings();
    return NextResponse.json(standings, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
    });
  } catch (err) {
    console.error("[api/standings] KFF request failed", err);
    return NextResponse.json({ error: "standings unavailable" }, { status: 502 });
  }
}
