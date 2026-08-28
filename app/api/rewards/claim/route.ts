import { NextResponse } from "next/server";
import { authenticateTelegramRequest, TelegramAuthError } from "@/lib/telegram/authenticateRequest";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { localDateYMD, nextLoginStreak, normalizedLoginDate } from "@/lib/dailyLoginReward";

const DAILY_BONUS = 10;

type UserEconomyRow = {
  coins: number | null;
  login_streak: number | null;
  last_login_date: string | null;
};

/**
 * Начисляет ежедневный бонус z-coins. Раньше это считалось и писалось прямо
 * с клиента (useDailyZCoins.ts) — любой мог отправить `update` с произвольным
 * telegram_id через публичный anon-ключ. Теперь identity подтверждается
 * подписанным initData, а запись идёт через service-role, RLS блокирует anon-запись.
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

  const { data: row, error: selErr } = await admin
    .from("users")
    .select("coins, login_streak, last_login_date")
    .eq("telegram_id", user.id)
    .maybeSingle();

  if (selErr) {
    console.error("[api/rewards/claim] select failed", selErr);
    return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "user not synced yet" }, { status: 409 });
  }

  const existing = row as UserEconomyRow;
  const todayYmd = localDateYMD(new Date());
  const lastYmd = normalizedLoginDate(existing.last_login_date);

  if (lastYmd === todayYmd) {
    return NextResponse.json({
      coins: existing.coins ?? 0,
      loginStreak: existing.login_streak ?? 0,
      claimed: false,
    });
  }

  const prevCoins = existing.coins ?? 0;
  const prevStreak = existing.login_streak ?? 0;
  const newStreak = nextLoginStreak(lastYmd, todayYmd, prevStreak);
  const newCoins = prevCoins + DAILY_BONUS;
  const lastRaw = existing.last_login_date;

  let upd = admin
    .from("users")
    .update({ coins: newCoins, login_streak: newStreak, last_login_date: todayYmd })
    .eq("telegram_id", user.id);

  upd = lastRaw == null || lastRaw === "" ? upd.is("last_login_date", null) : upd.eq("last_login_date", lastRaw);

  const { data: updated, error: upErr } = await upd.select("coins, login_streak").maybeSingle();

  if (upErr) {
    console.error("[api/rewards/claim] update failed", upErr);
    return NextResponse.json({ error: "claim failed" }, { status: 500 });
  }

  if (!updated) {
    // Условие last_login_date не совпало — параллельный запрос уже начислил бонус сегодня.
    const { data: again } = await admin
      .from("users")
      .select("coins, login_streak")
      .eq("telegram_id", user.id)
      .maybeSingle();
    return NextResponse.json({
      coins: again?.coins ?? prevCoins,
      loginStreak: again?.login_streak ?? prevStreak,
      claimed: false,
    });
  }

  return NextResponse.json({
    coins: updated.coins ?? newCoins,
    loginStreak: updated.login_streak ?? newStreak,
    claimed: true,
    dailyBonusAmount: DAILY_BONUS,
  });
}
