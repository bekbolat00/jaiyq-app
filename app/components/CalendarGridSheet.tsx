"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TEAM_ZHAIYQ } from "@/lib/constants/zhaiyq";
import { dbMatchRowToMatch } from "@/lib/matches/mapDbMatch";
import type { DbMatchRow } from "@/lib/types";

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
    transition: { type: "spring" as const, stiffness: 400, damping: 38 },
  },
  exit: { y: "100%", transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const } },
};

const WEEKDAYS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"] as const;

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null);
  const [matches, setMatches] = useState<DbMatchRow[]>([]);

  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();
  const titleText = `${MONTHS_RU[m]} ${y} г.`;

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
            className="absolute inset-0 bg-[#020308]/88 backdrop-blur-md"
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
            className="glass-premium relative z-10 flex max-h-[min(92dvh,720px)] w-full flex-col overflow-hidden rounded-t-[1.35rem] border-b-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/12" aria-hidden />

            <header className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-2 pb-3 pt-[max(0.35rem,env(safe-area-inset-top))]">
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/90 transition-colors hover:bg-white/[0.06]"
                aria-label="Назад"
              >
                <ChevronLeft className="h-6 w-6" strokeWidth={2} aria-hidden />
              </button>
              <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
                    setSelectedYmd(null);
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/75 transition-transform hover:bg-white/[0.06] hover:text-white/95 active:scale-95"
                  aria-label="Предыдущий месяц"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                </button>
                <h1
                  id="calendar-grid-title"
                  className="min-w-0 flex-1 text-center text-[15px] font-semibold lowercase tracking-wide text-white/90"
                >
                  {titleText}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
                    setSelectedYmd(null);
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/75 transition-transform hover:bg-white/[0.06] hover:text-white/95 active:scale-95"
                  aria-label="Следующий месяц"
                >
                  <ChevronRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                </button>
              </div>
              <span className="w-11 shrink-0" aria-hidden />
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="glass-premium space-y-2.5 rounded-2xl p-3 shadow-[0_0_40px_rgba(0,0,0,0.25)]">
                <div className="grid grid-cols-7 gap-0 border-b border-white/[0.05] px-0.5 pb-2.5">
                  {WEEKDAYS.map((d) => (
                    <div
                      key={d}
                      className="py-1.5 text-center text-[10px] font-black uppercase tracking-[0.12em] text-white/35"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid auto-rows-fr grid-cols-7 gap-2">
                  {cells.map((cell, idx) => {
                    if (cell.kind === "pad") {
                      return <div key={`p-${idx}`} className="min-h-[60px]" aria-hidden />;
                    }
                    const { day } = cell;
                    const ymd = toYmd(y, m, day);
                    const dayMatch: ReturnType<typeof dbMatchRowToMatch> | undefined = filtered.find(
                      (m) => new Date(m.kickoffAt).getDate() === day,
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
                        className={`relative flex min-h-[60px] flex-col items-center justify-center overflow-hidden rounded-2xl border px-0.5 py-1.5 transition-[background,border-color,box-shadow] ${
                          selected
                            ? "border-accent bg-accent/15 shadow-[0_0_24px_rgba(0,240,255,0.22)]"
                            : "border-white/[0.08] bg-white/[0.03] hover:border-white/12 hover:bg-white/[0.05]"
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
                          <div className="absolute inset-0 flex items-center justify-center bg-[#0F172A] rounded-lg">
                            {opponentLogo ? (
                              // eslint-disable-next-line @next/next/no-img-element -- external / local logo URLs
                              <img
                                src={opponentLogo}
                                alt="Opponent"
                                className="w-7 h-7 object-contain drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                              />
                            ) : null}
                          </div>
                        ) : (
                          <span className="relative z-0 text-[16px] font-semibold tabular-nums text-white/45">
                            {day}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
