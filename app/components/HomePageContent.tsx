"use client";

import { useMemo, useState } from "react";
import AppTopHeader from "@/app/components/AppTopHeader";
import DailyCoinsSheet from "@/app/components/DailyCoinsSheet";
import HomeSectionTabs from "@/app/components/HomeSectionTabs";
import NotificationsSheet from "@/app/components/NotificationsSheet";
import PromoCarousel from "@/app/components/PromoCarousel";
import TabEnterMotion from "@/app/components/TabEnterMotion";
import { useDailyZCoins } from "@/app/hooks/useDailyZCoins";
import { NOTIFICATIONS } from "@/lib/data/mock";

export default function HomePageContent() {
  const wallet = useDailyZCoins();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const hasUnreadNotifications = useMemo(
    () => NOTIFICATIONS.some((n) => n.isNew),
    [],
  );

  return (
    <TabEnterMotion className="flex flex-col gap-3">
      <AppTopHeader
        coins={wallet.coins}
        onNotificationsClick={() => setNotificationsOpen(true)}
        hasUnreadNotifications={hasUnreadNotifications}
      />
      <NotificationsSheet
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        items={NOTIFICATIONS}
      />
      <DailyCoinsSheet
        open={wallet.rewardOpen}
        onClose={() => wallet.setRewardOpen(false)}
        streak={wallet.rewardStreak}
        bonusAmount={wallet.dailyBonusAmount}
      />

      <header className="mt-0 space-y-0.5">
        <p className="neon-cyan text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
          ФК Жайык
        </p>
        <p className="text-[13px] leading-tight text-muted">
          Билеты, календарь и турнир в одном экране
        </p>
      </header>

      <PromoCarousel />

      <HomeSectionTabs coins={wallet.coins} />
    </TabEnterMotion>
  );
}
