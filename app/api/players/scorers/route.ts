import { NextResponse } from "next/server";
import { fetchScorerCandidates } from "@/lib/kff/scorers";

export const maxDuration = 30;

/** Кандидаты «кто забьёт первым» для прогноза. */
export async function GET() {
  try {
    const players = await fetchScorerCandidates();
    return NextResponse.json(
      { players },
      { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    console.error("[api/players/scorers] failed", err);
    return NextResponse.json({ error: "scorers unavailable" }, { status: 502 });
  }
}
