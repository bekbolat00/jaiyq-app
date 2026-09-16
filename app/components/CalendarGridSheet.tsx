"use client";

import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TEAM_ZHAIYQ } from "@/lib/constants/zhaiyq";
import { dbMatchRowToMatch } from "@/lib/matches/mapDbMatch";
import { formatKickoff } from "@/lib/matches/formatKickoff";
import type { DbMatchRow, Match } from "@/lib/types";
import { outcomeFor, ResultBadge } from "@/app/components/ui/Badges";
import Crest from "@/app/components/ui/Crest";

type Props = {
  open: boolean;
  onClose: () => void;
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const sheetVariants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 36 },
  },
  exit: { y: "100%", transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const } },
};

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

const MONTHS_RU = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
] as const;

function toYmd(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildGridCells(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const out: Array<{ kind: "pad" } | { kind: "day"; day: number }> = [];
  for (let i = 0; i < mondayOffset; i++) out.push({ kind: "pad" });
  for (let d = 1; d <= daysInMonth; d++) out.push({ kind: "day", day: d });
  while (out.length % 7 !== 0) out.push({ kind: "pad" });
  return out;
}

export default function CalendarGridSheet({ open, onClose }: Props) {
  useTelegramBackButton(open, onClose);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null);
  const [matches, setMatches] = useState<DbMatchRow[]>([]);

  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();
  const monthName = MONTHS_RU[m];
  const titleText = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${y}`;

  const matchByYmd = useMemo(() => {
    const map = new Map<string, DbMatchRow>();
    for (const row of matches) {
      if (row.match_date) map.set(row.match_date, row);
    }
    return map;
  }, [matches]);

  const filtered = useMemo(
    () =>
      matches
        .filter((row) => {
          if (!row.match_date) return false;
          const d = new Date(row.match_date);
          return d.getFullYear() === y && d.getMonth() === m;
        })
        .map(dbMatchRowToMatch),
    [matches, y, m],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("matches").select("*");
      if (cancelled || !data) return;
      setMatches(data as DbMatchRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cells = useMemo(() => buildGridCells(y, m), [y, m]);

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

  const selectedDay = selectedYmd ? Number(selectedYmd.slice(8, 10)) : null;
  const selectedMatch =
    selectedDay != null ? filtered.find((mm) => new Date(mm.kickoffAt).getDate() === selectedDay) ?? null : null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[110] flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-background/80"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-grid-title"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 mx-auto flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-b-0 border-line bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong" aria-hidden />

            <header className="flex shrink-0 items-center gap-1 px-2 pb-2 pt-2">
              <h1 id="calendar-grid-title" className="t-h2 min-w-0 flex-1 truncate pl-2 text-foreground">
                {titleText}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
                  setSelectedYmd(null);
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors active:bg-surface-2"
                aria-label="Предыдущий месяц"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
                  setSelectedYmd(null);
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors active:bg-surface-2"
                aria-label="Следующий месяц"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors active:bg-surface-2"
                aria-label="Закрыть календарь"
              >
                <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="grid grid-cols-7 gap-1.5 pb-2">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="t-caption py-1 text-center text-subtle">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {cells.map((cell, idx) => {
                  if (cell.kind === "pad") {
                    return <div key={`p-${idx}`} className="h-14" aria-hidden />;
                  }
                  const { day } = cell;
                  const ymd = toYmd(y, m, day);
                  const dayMatch: ReturnType<typeof dbMatchRowToMatch> | undefined = filtered.find(
                    (mm) => new Date(mm.kickoffAt).getDate() === day,
                  );
                  const match = matchByYmd.get(ymd) ?? null;
                  const selected = selectedYmd === ymd;
                  const isZhaiyqHome =
                    dayMatch &&
                    (dayMatch.home.id === TEAM_ZHAIYQ.id ||
                      dayMatch.home.fullName === TEAM_ZHAIYQ.fullName ||
                      dayMatch.home.shortName === TEAM_ZHAIYQ.shortName);
                  const opponentLogo =
                    dayMatch && (isZhaiyqHome ? dayMatch.away.logoUrl : dayMatch.home.logoUrl);
                  return (
                    <button
                      key={ymd}
                      type="button"
                      onClick={() => setSelectedYmd(ymd)}
                      className={`relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors duration-150 ${
                        selected
                          ? "bg-surface-2 ring-1 ring-inset ring-accent"
                          : dayMatch
                            ? "bg-surface-2"
                            : "active:bg-surface-2"
                      }`}
                      aria-pressed={selected}
                      aria-label={
                        dayMatch
                          ? `${day} — матч с ${isZhaiyqHome ? dayMatch.away.fullName : dayMatch.home.fullName}`
                          : match
                            ? `${day} ${match.opponent} — матч`
                            : `${day} число, без матча`
                      }
                    >
                      {dayMatch ? (
                        <>
                          {opponentLogo ? (
                            // eslint-disable-next-line @next/next/no-img-element -- external / local logo URLs
                            <img src={opponentLogo} alt="" className="h-6 w-6 object-contain" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                          )}
                          <span className="t-caption tabular-nums text-foreground">{day}</span>
                        </>
                      ) : (
                        <span className={`t-body tabular-nums ${selected ? "text-foreground" : "text-muted"}`}>
                          {day}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedYmd ? (
                <div className="mt-4">
                  {selectedMatch ? (
                    <SelectedMatchRow match={selectedMatch} />
                  ) : (
                    <p className="t-small py-3 text-center text-muted">В этот день матчей нет</p>
                  )}
                </div>
              ) : (
                <p className="t-small mt-4 py-3 text-center text-subtle">
                  Выберите день с логотипом соперника
                </p>
              )}
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SelectedMatchRow({ match }: { match: Match }) {
  const zhaiyqHome =
    match.home.id === TEAM_ZHAIYQ.id ||
    match.home.fullName === TEAM_ZHAIYQ.fullName ||
    match.home.shortName === TEAM_ZHAIYQ.shortName;
  const opponent = zhaiyqHome ? match.away : match.home;
  const score = match.finalScore;
  const zhaiyqScore = score ? (zhaiyqHome ? score.home : score.away) : null;
  const opponentScore = score ? (zhaiyqHome ? score.away : score.home) : null;
  const outcome = outcomeFor(zhaiyqScore, opponentScore);

  return (
    <div className="flex min-h-[64px] items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
      <Crest src={opponent.logoUrl} alt="" size={40} />
      <div className="min-w-0 flex-1">
        <p className="t-body truncate text-foreground">{opponent.fullName}</p>
        <p className="t-small truncate text-muted">
          {zhaiyqHome ? "Дома" : "В гостях"} · {formatKickoff(match.kickoffAt)}
        </p>
      </div>
      {score ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="t-h3 tabular-nums text-foreground">
            {score.home}:{score.away}
          </span>
          {outcome ? <ResultBadge outcome={outcome} /> : null}
        </div>
      ) : null}
    </div>
  );
}
