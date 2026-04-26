"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";
import { HOME_STANDINGS } from "@/lib/data/mock";
import ExpertPredictorSheet from "@/app/components/ExpertPredictorSheet";
import MainTabPanel from "@/app/components/MainTabPanel";
import MatchesSheet from "@/app/components/MatchesSheet";
import StandingsPanel from "@/app/components/StandingsPanel";
import { useAppMatches } from "@/app/hooks/useAppMatches";
import { dbMatchRowToExpertContext } from "@/lib/matches/mapDbMatch";
import type { DbMatchRow, ExpertMatchContext } from "@/lib/types";

const TABS = [
  { id: "main" as const, label: "ГЛАВНАЯ" },
  { id: "calendar" as const, label: "КАЛЕНДАРЬ" },
  { id: "table" as const, label: "ТАБЛИЦА" },
];

type TabId = (typeof TABS)[number]["id"];

const panelVariants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as const },
  },
};

type Props = {
  coins: number | null;
};

export default function HomeSectionTabs({ coins }: Props) {
  const [tab, setTab] = useState<TabId>("main");
  const [matchesOpen, setMatchesOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [expertContext, setExpertContext] = useState<ExpertMatchContext | null>(null);

  const { loading, error, upcomingMatches, pastMatches, refetch } = useAppMatches();

  const openExpert = useCallback((row: DbMatchRow) => {
    setExpertContext(dbMatchRowToExpertContext(row));
    setExpertOpen(true);
  }, []);

  const closeExpert = useCallback(() => {
    setExpertOpen(false);
    setExpertContext(null);
  }, []);

  function openMatches() {
    setTab("calendar");
    setMatchesOpen(true);
  }

  function closeMatches() {
    setMatchesOpen(false);
    setTab("main");
  }

  return (
    <div className="space-y-4">
      <ExpertPredictorSheet
        open={expertOpen}
        expertMatch={expertContext}
        onClose={closeExpert}
        onCompleted={() => {
          void refetch();
        }}
      />

      <MatchesSheet
        open={matchesOpen}
        onClose={closeMatches}
        coins={coins}
        loading={loading}
        fetchError={error}
        upcomingMatches={upcomingMatches}
        pastMatches={pastMatches}
        onExpertClick={openExpert}
      />

      <div
        className="glass-premium flex rounded-2xl p-1"
        role="tablist"
        aria-label="Главная, календарь и турнирная таблица"
      >
        {TABS.map((t) => {
          const active =
            (t.id === "main" && tab === "main" && !matchesOpen) ||
            (t.id === "table" && tab === "table" && !matchesOpen) ||
            (t.id === "calendar" && matchesOpen);
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                if (t.id === "calendar") {
                  openMatches();
                  return;
                }
                setMatchesOpen(false);
                setTab(t.id);
              }}
              className={`relative z-0 flex-1 rounded-xl py-2.5 text-center text-[10px] font-bold uppercase tracking-wide transition-colors sm:text-[11px] ${
                active ? "text-[#020408]" : "text-muted hover:text-foreground/80"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="home-tab-pill"
                  className="absolute inset-0 z-0 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#00a8d6] shadow-[0_0_20px_rgba(0,240,255,0.35)]"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span className="relative z-10">{t.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {tab === "main" && !matchesOpen ? (
          <motion.div
            key="main"
            role="tabpanel"
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-6"
          >
            <MainTabPanel onViewAllMatches={openMatches} pastMatches={pastMatches} />
          </motion.div>
        ) : null}
        {tab === "table" && !matchesOpen ? (
          <motion.div
            key="table"
            role="tabpanel"
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <StandingsPanel rows={HOME_STANDINGS} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
