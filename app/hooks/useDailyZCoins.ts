"use client";

import { useEffect, useState } from "react";
import { getTelegramInitData } from "@/lib/telegram/getInitData";

const DAILY_BONUS = 10;

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

type ClaimResponse = {
  coins: number;
  loginStreak: number;
  claimed: boolean;
};

/**
 * Начисление ежедневного бонуса теперь идёт через /api/rewards/claim:
 * сервер сам проверяет подпись initData и пишет coins service-role клиентом.
 * Раньше сумма считалась и записывалась прямо с клиента — любой мог
 * подставить чужой/произвольный telegram_id через devtools.
 */
export function useDailyZCoins() {
  const [coins, setCoins] = useState<number | null>(null);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardStreak, setRewardStreak] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      let initData = getTelegramInitData();
      for (let i = 0; i < 10 && !initData; i++) {
        await sleep(350);
        if (cancelled) return;
        initData = getTelegramInitData();
      }
      if (cancelled || !initData) {
        setCoins(0);
        return;
      }

      let result: ClaimResponse | null = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        const res = await fetch("/api/rewards/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });
        if (cancelled) return;

        if (res.ok) {
          result = (await res.json()) as ClaimResponse;
          break;
        }
        if (res.status !== 409) {
          console.error("[useDailyZCoins] claim failed", res.status, await res.text());
          break;
        }
        // 409 = профиль ещё не синхронизирован TelegramAuth — подождать и повторить.
        await sleep(400);
      }

      if (cancelled) return;
      if (!result) {
        setCoins(0);
        return;
      }

      setCoins(result.coins);
      if (result.claimed) {
        setRewardStreak(result.loginStreak);
        setRewardOpen(true);
      }
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
