"use client";

import { useEffect, useState } from "react";
import {
  localDateYMD,
  nextLoginStreak,
  normalizedLoginDate,
} from "@/lib/dailyLoginReward";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const TG_STORAGE_KEY = "tg_user_id";
const DAILY_BONUS = 10;

function readTelegramId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TG_STORAGE_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

type UserEconomyRow = {
  coins: number | null;
  login_streak: number | null;
  last_login_date: string | null;
};

export function useDailyZCoins() {
  const [coins, setCoins] = useState<number | null>(null);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardStreak, setRewardStreak] = useState(1);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setCoins(0);
      return;
    }

    let cancelled = false;

    async function run() {
      let telegramId = readTelegramId();
      for (let i = 0; i < 10 && telegramId == null; i++) {
        await sleep(350);
        if (cancelled) return;
        telegramId = readTelegramId();
      }
      if (cancelled || telegramId == null) {
        setCoins(0);
        return;
      }

      let user: UserEconomyRow | null = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        const { data: row, error: selErr } = await supabase
          .from("users")
          .select("coins, login_streak, last_login_date")
          .eq("telegram_id", telegramId)
          .maybeSingle();
        if (cancelled) return;
        if (!selErr && row) {
          user = row as UserEconomyRow;
          break;
        }
        await sleep(400);
      }

      if (!user) {
        if (!cancelled) setCoins(0);
        return;
      }
      const todayYmd = localDateYMD(new Date());
      const lastYmd = normalizedLoginDate(user.last_login_date);

      if (lastYmd === todayYmd) {
        setCoins(user.coins ?? 0);
        return;
      }

      const prevCoins = user.coins ?? 0;
      const prevStreak = user.login_streak ?? 0;
      const newStreak = nextLoginStreak(lastYmd, todayYmd, prevStreak);
      const newCoins = prevCoins + DAILY_BONUS;
      const lastRaw = user.last_login_date;

      let upd = supabase
        .from("users")
        .update({
          coins: newCoins,
          login_streak: newStreak,
          last_login_date: todayYmd,
        })
        .eq("telegram_id", telegramId);

      if (lastRaw == null || lastRaw === "") {
        upd = upd.is("last_login_date", null);
      } else {
        upd = upd.eq("last_login_date", lastRaw);
      }

      const { data: updated, error: upErr } = await upd.select("coins, login_streak").maybeSingle();

      if (cancelled) return;

      if (upErr || !updated) {
        const { data: again } = await supabase
          .from("users")
          .select("coins, last_login_date")
          .eq("telegram_id", telegramId)
          .maybeSingle();
        if (!cancelled) setCoins(again?.coins ?? prevCoins);
        return;
      }

      setCoins(updated.coins ?? newCoins);
      setRewardStreak(updated.login_streak ?? newStreak);
      setRewardOpen(true);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    coins,
    rewardOpen,
    setRewardOpen,
    rewardStreak,
    dailyBonusAmount: DAILY_BONUS,
  };
}
