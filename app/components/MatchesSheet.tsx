"use client";

import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CalendarDays, CalendarX2, ChevronLeft, Loader2, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import CalendarGridSheet from "@/app/components/CalendarGridSheet";
import FinishedMatchResultCard from "@/app/components/FinishedMatchResultCard";
import UpcomingMatchScheduleCard from "@/app/components/UpcomingMatchScheduleCard";
import EmptyState from "@/app/components/ui/EmptyState";
import Tabs from "@/app/components/ui/Tabs";
import type { DbMatchRow } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Больше не показывается в шапке «Матчей»; оставлено для совместимости с вызывающим кодом. */
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
    transition: { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
  },
};

type InnerTab = "schedule" | "results";

const TABS: { id: InnerTab; label: string }[] = [
  { id: "schedule", label: "Расписание" },
  { id: "results", label: "Результаты" },
];

export default function MatchesSheet({
  open,
  onClose,
  loading,
  fetchError,
  matches,
  onExpertClick,
  onOpenMatchDetail,
}: Props) {
  useTelegramBackButton(open, onClose);
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

      {/* z-45: над нижним меню (z-40), но под шторками, которые открываются
          отсюда, — карточка матча (50), «Эксперт» (60), билет (70). */}
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[45] flex flex-col bg-background"
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
              className="flex min-h-0 flex-1 flex-col bg-background pt-[env(safe-area-inset-top)]"
            >
              <header className="flex shrink-0 items-center gap-1 px-2 pb-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-foreground transition-colors active:bg-surface-2"
                  aria-label="Назад"
                >
                  <ChevronLeft className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                </button>
                <h1 id="matches-sheet-title" className="t-h1 min-w-0 flex-1 truncate text-foreground">
                  Матчи
                </h1>
                <button
                  type="button"
                  onClick={() => setGridOpen(true)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-accent transition-colors active:bg-accent/[0.08]"
                  aria-label="Календарь"
                >
                  <CalendarDays className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </button>
              </header>

              <Tabs
                layoutId="matches-sheet-tabs"
                value={innerTab}
                onChange={setInnerTab}
                tabs={TABS}
                className="mx-4 shrink-0"
              />

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
                {loading ? (
                  <div className="flex min-h-[240px] flex-col items-center justify-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-muted" strokeWidth={1.75} aria-hidden />
                    <p className="t-small text-muted">Загружаем матчи</p>
                  </div>
                ) : fetchError ? (
                  <EmptyState
                    icon={<AlertCircle className="h-6 w-6" strokeWidth={1.75} />}
                    title="Не удалось загрузить матчи"
                    description={fetchError}
                  />
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
                          <EmptyState
                            icon={<CalendarX2 className="h-6 w-6" strokeWidth={1.75} />}
                            title={listEmptyMessage}
                            description="Расписание обновится, как только лига опубликует новые туры"
                          />
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
                        <EmptyState
                          icon={<Trophy className="h-6 w-6" strokeWidth={1.75} />}
                          title={listEmptyMessage}
                          description="Результаты появятся после первого сыгранного матча"
                        />
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
