"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import CalendarGridSheet from "@/app/components/CalendarGridSheet";
import FinishedMatchResultCard from "@/app/components/FinishedMatchResultCard";
import UpcomingMatchScheduleCard from "@/app/components/UpcomingMatchScheduleCard";
import type { DbMatchRow } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  coins: number | null;
  loading: boolean;
  fetchError: string | null;
  matches: DbMatchRow[];
  onExpertClick: (row: DbMatchRow) => void;
  onOpenMatchDetail?: (matchId: string) => void;
};

const sheetVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 36 },
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: { duration: 0.26, ease: [0.4, 0, 0.2, 1] as const },
  },
};

const listVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
  },
};

function formatCoins(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("ru-RU");
}

type InnerTab = "schedule" | "results";

export default function MatchesSheet({
  open,
  onClose,
  coins,
  loading,
  fetchError,
  matches,
  onExpertClick,
  onOpenMatchDetail,
}: Props) {
  const [innerTab, setInnerTab] = useState<InnerTab>("schedule");
  const [gridOpen, setGridOpen] = useState(false);

  const scheduleRows = useMemo(() => {
    const upcoming = matches
      .filter((m) => m.status === "upcoming")
      .sort(
        (a, b) =>
          new Date(a.match_date).getTime() - new Date(b.match_date).getTime(),
      );
    return upcoming.slice(0, 3);
  }, [matches]);

  const finishedRows = useMemo(
    () =>
      matches
        .filter((m) => m.status === "finished")
        .sort(
          (a, b) =>
            new Date(b.match_date).getTime() - new Date(a.match_date).getTime(),
        ),
    [matches],
  );

  const handleClose = useCallback(() => {
    setGridOpen(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (gridOpen) return;
      handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, gridOpen, handleClose]);

  const listEmptyMessage =
    innerTab === "schedule" ? "Нет предстоящих матчей" : "Нет отыгранных матчей";

  return (
    <>
      <CalendarGridSheet open={gridOpen} onClose={() => setGridOpen(false)} />

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[95] flex flex-col bg-[#020308]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="presentation"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="matches-sheet-title"
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-[#060810] via-[#040508] to-[#020308] pt-[env(safe-area-inset-top)] shadow-[0_0_120px_rgba(0,0,0,0.65)]"
            >
              <header className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-2 py-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/90 transition-colors hover:bg-white/[0.06]"
                  aria-label="Назад"
                >
                  <ChevronLeft className="h-6 w-6" strokeWidth={2} aria-hidden />
                </button>
                <h1
                  id="matches-sheet-title"
                  className="min-w-0 flex-1 text-center text-lg font-black uppercase tracking-[0.2em] text-white"
                >
                  МАТЧИ
                </h1>
                <div className="flex shrink-0 items-center gap-2">
                  <div
                    className="flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.06] px-2.5 py-1.5"
                    title="Жайык-Коины"
                  >
                    <span className="text-[12px] font-black tabular-nums text-white/95">
                      {formatCoins(coins)}
                    </span>
                    <span className="select-none text-[14px] leading-none" aria-hidden>
                      🪙
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGridOpen(true)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-accent transition-colors hover:bg-white/[0.07]"
                    aria-label="Календарь"
                  >
                    <Calendar className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </button>
                </div>
              </header>

              <div className="flex shrink-0 gap-2 px-3 pb-3 pt-2">
                <motion.button
                  type="button"
                  layout
                  onClick={() => setInnerTab("schedule")}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className={`min-h-[44px] flex-1 rounded-2xl py-2.5 text-center text-[10px] font-black uppercase tracking-[0.14em] transition-[color,background,box-shadow] sm:text-[11px] ${
                    innerTab === "schedule"
                      ? "bg-accent text-[#020308] shadow-[0_0_22px_rgba(0,240,255,0.28)]"
                      : "bg-white/[0.06] text-white/45 hover:text-white/70"
                  }`}
                >
                  РАСПИСАНИЕ
                </motion.button>
                <motion.button
                  type="button"
                  layout
                  onClick={() => setInnerTab("results")}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className={`min-h-[44px] flex-1 rounded-2xl py-2.5 text-center text-[10px] font-black uppercase tracking-[0.14em] transition-[color,background,box-shadow] sm:text-[11px] ${
                    innerTab === "results"
                      ? "bg-accent text-[#020308] shadow-[0_0_22px_rgba(0,240,255,0.28)]"
                      : "bg-white/[0.06] text-white/45 hover:text-white/70"
                  }`}
                >
                  РЕЗУЛЬТАТЫ
                </motion.button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                {loading ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 py-12">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                    <p className="text-center text-xs font-bold uppercase tracking-widest text-white/45">
                      Загрузка матчей…
                    </p>
                  </div>
                ) : fetchError ? (
                  <p className="rounded-2xl border border-dashed border-rose-500/30 bg-rose-500/5 py-10 text-center text-sm text-rose-200/90">
                    {fetchError}
                  </p>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={innerTab}
                      role="list"
                      variants={listVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="flex min-h-[120px] flex-col gap-3"
                    >
                      {innerTab === "schedule" ? (
                        scheduleRows.length === 0 ? (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] py-10 text-center text-sm text-white/40"
                          >
                            {listEmptyMessage}
                          </motion.p>
                        ) : (
                          scheduleRows.map((row, i) => (
                            <UpcomingMatchScheduleCard
                              key={row.id}
                              row={row}
                              index={i}
                              onExpertClick={() => onExpertClick(row)}
                            />
                          ))
                        )
                      ) : finishedRows.length === 0 ? (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] py-10 text-center text-sm text-white/40"
                        >
                          {listEmptyMessage}
                        </motion.p>
                      ) : (
                        finishedRows.map((row, i) => (
                          <FinishedMatchResultCard
                            key={row.id}
                            row={row}
                            index={i}
                            onAboutMatch={
                              onOpenMatchDetail
                                ? () => onOpenMatchDetail(row.id)
                                : undefined
                            }
                          />
                        ))
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
