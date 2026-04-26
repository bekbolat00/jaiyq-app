"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { HOME_CALENDAR_MATCHES, HOME_STANDINGS } from "@/lib/data/mock";
import MainTabPanel from "@/app/components/MainTabPanel";
import MatchCalendarPanel from "@/app/components/MatchCalendarPanel";
import StandingsPanel from "@/app/components/StandingsPanel";

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

export default function HomeSectionTabs() {
  const [tab, setTab] = useState<TabId>("main");

  return (
    <div className="space-y-4">
      <div
        className="glass-premium flex rounded-2xl p-1"
        role="tablist"
        aria-label="Главная, календарь и турнирная таблица"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
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
        {tab === "main" ? (
          <motion.div
            key="main"
            role="tabpanel"
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-6"
          >
            <MainTabPanel onViewAllMatches={() => setTab("calendar")} />
          </motion.div>
        ) : null}
        {tab === "calendar" ? (
          <motion.div
            key="calendar"
            role="tabpanel"
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <MatchCalendarPanel matches={HOME_CALENDAR_MATCHES} />
          </motion.div>
        ) : null}
        {tab === "table" ? (
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
