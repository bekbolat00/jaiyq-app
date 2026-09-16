"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import MainTabPanel from "@/app/components/MainTabPanel";
import MatchDetailSheet from "@/app/components/MatchDetailSheet";
import MatchesSheet from "@/app/components/MatchesSheet";
import StandingsPanel from "@/app/components/StandingsPanel";
import Tabs from "@/app/components/ui/Tabs";
import type { UseAppMatchesResult } from "@/app/hooks/useAppMatches";
import type { DbMatchRow } from "@/lib/types";

type TabId = "main" | "table";

const TABS: { id: TabId; label: string }[] = [
  { id: "main", label: "Обзор" },
  { id: "table", label: "Турнирная таблица" },
];

const panelVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] as const } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] as const } },
};

type Props = {
  coins: number | null;
  matchesState: UseAppMatchesResult;
  onExpertClick: (row: DbMatchRow) => void;
};

/**
 * Обзор и таблица — настоящие табы. Полный календарь матчей открывается
 * отдельным экраном по «Все» из секции «Последние матчи», а не прячется
 * за табом, который ведёт себя как кнопка.
 */
export default function HomeSectionTabs({ coins, matchesState, onExpertClick }: Props) {
  const [tab, setTab] = useState<TabId>("main");
  const [matchesOpen, setMatchesOpen] = useState(false);
  const [matchDetailId, setMatchDetailId] = useState<string | null>(null);

  const { loading, error, upcomingMatches, pastMatches } = matchesState;

  return (
    <div>
      <MatchDetailSheet
        open={matchDetailId !== null}
        onClose={() => setMatchDetailId(null)}
        matchId={matchDetailId}
      />
      <MatchesSheet
        open={matchesOpen}
        onClose={() => setMatchesOpen(false)}
        coins={coins}
        loading={loading}
        fetchError={error}
        matches={[...upcomingMatches, ...pastMatches]}
        onExpertClick={onExpertClick}
        onOpenMatchDetail={(id) => setMatchDetailId(id)}
      />

      <Tabs tabs={TABS} value={tab} onChange={setTab} layoutId="home-tabs" className="mb-6" />

      <AnimatePresence mode="wait" initial={false}>
        {tab === "main" ? (
          <motion.div key="main" role="tabpanel" variants={panelVariants} initial="initial" animate="animate" exit="exit">
            <MainTabPanel
              onViewAllMatches={() => setMatchesOpen(true)}
              pastMatches={pastMatches}
              onOpenMatchDetail={(id) => setMatchDetailId(id)}
            />
          </motion.div>
        ) : (
          <motion.div key="table" role="tabpanel" variants={panelVariants} initial="initial" animate="animate" exit="exit">
            <StandingsPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
