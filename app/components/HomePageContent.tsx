"use client";

import { useCallback, useMemo, useState } from "react";
import AppTopHeader from "@/app/components/AppTopHeader";
import DailyCoinsSheet from "@/app/components/DailyCoinsSheet";
import ExpertPredictorSheet from "@/app/components/ExpertPredictorSheet";
import HomeSectionTabs from "@/app/components/HomeSectionTabs";
import NextMatchHero from "@/app/components/NextMatchHero";
import NotificationsSheet from "@/app/components/NotificationsSheet";
import PromoCarousel from "@/app/components/PromoCarousel";
import TabEnterMotion from "@/app/components/TabEnterMotion";
import { useAppMatches } from "@/app/hooks/useAppMatches";
import { useDailyZCoins } from "@/app/hooks/useDailyZCoins";
import { dbMatchRowToExpertContext } from "@/lib/matches/mapDbMatch";
import { NOTIFICATIONS } from "@/lib/data/mock";
import type { DbMatchRow, ExpertMatchContext } from "@/lib/types";

export default function HomePageContent() {
  const wallet = useDailyZCoins();
  const matchesState = useAppMatches();
  const [expertOpen, setExpertOpen] = useState(false);
  const [expertContext, setExpertContext] = useState<ExpertMatchContext | null>(null);

  const openExpert = useCallback((row: DbMatchRow) => {
    setExpertContext(dbMatchRowToExpertContext(row));
    setExpertOpen(true);
  }, []);

  const closeExpert = useCallback(() => {
    setExpertOpen(false);
    setExpertContext(null);
  }, []);

  const heroMatch = useMemo(() => {
    const upcoming = matchesState.upcomingMatches.filter((m) => m.status === "upcoming");
    return (
      [...upcoming].sort(
        (a, b) =>
          new Date(a.match_date).getTime() - new Date(b.match_date).getTime(),
      )[0] ?? null
    );
  }, [matchesState.upcomingMatches]);
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

      <ExpertPredictorSheet
        open={expertOpen}
        expertMatch={expertContext}
        onClose={closeExpert}
        onCompleted={() => {
          void matchesState.refetch();
        }}
      />

      <header className="mt-0 space-y-0.5">
        <p className="neon-cyan text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
          ФК Жайык
        </p>
        <p className="text-[13px] leading-tight text-muted">
          Билеты, календарь и турнир в одном экране
        </p>
      </header>

      <PromoCarousel heroMatch={heroMatch} matchesLoading={matchesState.loading} />

      <NextMatchHero
        match={heroMatch}
        loading={matchesState.loading}
        onExpertClick={openExpert}
      />

      <HomeSectionTabs
        coins={wallet.coins}
        matchesState={matchesState}
        onExpertClick={openExpert}
      />
    </TabEnterMotion>
  );
}
