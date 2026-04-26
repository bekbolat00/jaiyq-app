"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { MatchCenterViewModel } from "@/lib/data/mock";
import MatchSpartakStats from "@/app/components/MatchSpartakStats";
import MatchTimeline from "@/app/components/MatchTimeline";
import TeamBadge from "@/app/components/TeamBadge";

const TABS = [
  { id: "overview" as const, label: "ОБЗОР" },
  { id: "squads" as const, label: "СОСТАВЫ" },
  { id: "stats" as const, label: "СТАТИСТИКА" },
];

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const sheetVariants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring" as const, stiffness: 420, damping: 40 },
  },
  exit: { y: "100%", transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const } },
};

const panelTabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18 } },
};

type Props = {
  open: boolean;
  onClose: () => void;
  detail: MatchCenterViewModel | null;
};

export default function MatchDetailSheet({ open, onClose, detail }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const [lastDetail, setLastDetail] = useState<MatchCenterViewModel | null>(null);

  useEffect(() => {
    if (!detail) return;
    queueMicrotask(() => setLastDetail(detail));
  }, [detail]);

  const resolved = detail ?? lastDetail;

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => setTab("overview"));
  }, [open, detail?.home.id, detail?.away.id]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!resolved) {
    return null;
  }

  const {
    home,
    away,
    homeScore,
    awayScore,
    competition,
    statusLabel,
    timeline,
    stats,
    homeSquad,
    awaySquad,
  } = resolved;

  return (
    <AnimatePresence
      onExitComplete={() => {
        setLastDetail(null);
      }}
    >
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal
          aria-labelledby="match-center-title"
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-[#020408]/72 backdrop-blur-sm"
            aria-label="Закрыть"
            onClick={onClose}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          />
          <motion.aside
            className="glass-premium relative z-10 flex h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 border-b-0 bg-[#020408]/95 shadow-[0_-12px_48px_rgba(0,0,0,0.55)]"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/15" aria-hidden />

            <div className="shrink-0 border-b border-white/10 px-4 pb-4 pt-3">
              <p
                id="match-center-title"
                className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted"
              >
                {competition} · {statusLabel}
              </p>

              <div className="mt-5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                  <TeamBadge team={home} size="lg" />
                  <span className="text-[11px] font-black uppercase tracking-wide text-foreground">
                    {home.shortName}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 font-mono text-[clamp(2.25rem,9vw,3rem)] font-black leading-none tracking-tight text-foreground">
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  >
                    {homeScore}
                  </motion.span>
                  <span className="pb-1 text-[0.45em] font-bold text-white/25">:</span>
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.06, type: "spring", stiffness: 260, damping: 18 }}
                  >
                    {awayScore}
                  </motion.span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                  <TeamBadge team={away} size="lg" />
                  <span className="text-[11px] font-black uppercase tracking-wide text-foreground">
                    {away.shortName}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="glass-premium flex shrink-0 gap-0.5 border-b border-white/10 p-1"
              role="tablist"
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
                    className={`relative flex-1 rounded-xl py-2.5 text-center text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      active ? "text-[#020408]" : "text-muted hover:text-foreground/80"
                    }`}
                  >
                    {active ? (
                      <motion.span
                        layoutId="match-center-tab"
                        className="absolute inset-0 z-0 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#00a8d6] shadow-[0_0_16px_rgba(0,240,255,0.3)]"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    ) : null}
                    <span className="relative z-10">{t.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              <AnimatePresence mode="wait">
                {tab === "overview" ? (
                  <motion.div
                    key="ov"
                    role="tabpanel"
                    variants={panelTabVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <div className="glass rounded-2xl p-4">
                      <MatchTimeline events={timeline} heading="" />
                    </div>
                  </motion.div>
                ) : null}
                {tab === "squads" ? (
                  <motion.div
                    key="sq"
                    role="tabpanel"
                    variants={panelTabVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="mb-2 text-center text-[9px] font-bold uppercase tracking-widest text-muted">
                          {home.shortName}
                        </p>
                        <ul className="space-y-1.5">
                          {homeSquad.map((line) => (
                            <li
                              key={line}
                              className="rounded-lg border border-white/8 bg-white/[0.04] px-2 py-1.5 text-[11px] font-medium text-foreground/90"
                            >
                              {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-2 text-center text-[9px] font-bold uppercase tracking-widest text-muted">
                          {away.shortName}
                        </p>
                        <ul className="space-y-1.5">
                          {awaySquad.map((line) => (
                            <li
                              key={line}
                              className="rounded-lg border border-white/8 bg-white/[0.04] px-2 py-1.5 text-[11px] font-medium text-foreground/90"
                            >
                              {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
                {tab === "stats" ? (
                  <motion.div
                    key="st"
                    role="tabpanel"
                    variants={panelTabVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <div className="glass-premium rounded-2xl p-4">
                      <MatchSpartakStats
                        stats={stats}
                        className="!mt-0"
                        rows={["possession", "shotsOnTarget"]}
                      />
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
