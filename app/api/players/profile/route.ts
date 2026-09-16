import { NextResponse } from "next/server";
import { fetchPlayerProfile, PlayerNotFoundError } from "@/lib/kff/playerProfile";

/** Профиль игрока Жайыка с KFF: `GET /api/players/profile?number=79&surname=Чирков`. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const number = (params.get("number") ?? "").trim();
  const surname = (params.get("surname") ?? "").trim();
  if (!/^\d{1,3}$/.test(number) || surname.length < 2 || surname.length > 60) {
    return NextResponse.json({ error: "invalid player" }, { status: 400 });
  }

  try {
    const profile = await fetchPlayerProfile(number, surname);
    return NextResponse.json(profile, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    if (err instanceof PlayerNotFoundError) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    console.error("[api/players/profile] KFF request failed", err);
    return NextResponse.json({ error: "profile unavailable" }, { status: 502 });
  }
}
