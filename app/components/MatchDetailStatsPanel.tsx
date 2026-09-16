"use client";

import { motion } from "framer-motion";
import type { LiveMatchStatsShape } from "@/lib/data/mock";

type StatKey = keyof Pick<
  LiveMatchStatsShape,
  | "possession"
  | "shots"
  | "shotsOnTarget"
  | "corners"
  | "yellowCards"
  | "saves"
>;

const STAT_ROWS: { key: StatKey; label: string; format: "percent" | "int" }[] = [
  { key: "possession", label: "Владение мячом", format: "percent" },
  { key: "shots", label: "Удары", format: "int" },
  { key: "shotsOnTarget", label: "Удары в створ", format: "int" },
  { key: "corners", label: "Угловые", format: "int" },
  { key: "yellowCards", label: "Жёлтые карточки", format: "int" },
  { key: "saves", label: "Сейвы", format: "int" },
];

type Props = {
  stats: LiveMatchStatsShape;
  homeName: string;
  awayName: string;
};

function formatValue(value: number, format: "percent" | "int"): string {
  if (format === "percent") {
    return `${Math.round(value)}%`;
  }
  return String(Math.round(value));
}

/** Сравнение команд по матчу — одна карточка, строки через разделитель. */
export default function MatchDetailStatsPanel({ stats, homeName, awayName }: Props) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <span className="t-caption flex min-w-0 items-center gap-2 text-muted">
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
          <span className="truncate">{homeName}</span>
        </span>
        <span className="t-caption flex min-w-0 items-center gap-2 text-muted">
          <span className="truncate">{awayName}</span>
          <span className="h-2 w-2 shrink-0 rounded-full bg-muted/40" aria-hidden />
        </span>
      </div>

      <ul className="divide-y divide-line">
        {STAT_ROWS.map((row, index) => {
          const { home, away } = stats[row.key];
          const total = home + away;
          const homeShare = total > 0 ? (home / total) * 100 : 0;
          const awayShare = total > 0 ? (away / total) * 100 : 0;

          return (
            <li key={row.key} className="px-4 py-3.5">
              <div className="grid grid-cols-[56px_1fr_56px] items-center gap-2">
                <span className="t-h3 tabular-nums text-foreground">{formatValue(home, row.format)}</span>
                <span className="t-small text-center text-muted">{row.label}</span>
                <span className="t-h3 text-right tabular-nums text-foreground">
                  {formatValue(away, row.format)}
                </span>
              </div>
              <div className="mt-2.5 flex h-1 w-full gap-1">
                <div className="flex h-full flex-1 justify-end overflow-hidden rounded-full bg-surface-2">
                  <motion.div
                    className="h-full rounded-full bg-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${homeShare}%` }}
                    transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1], delay: index * 0.04 }}
                  />
                </div>
                <div className="flex h-full flex-1 justify-start overflow-hidden rounded-full bg-surface-2">
                  <motion.div
                    className="h-full rounded-full bg-muted/40"
                    initial={{ width: 0 }}
                    animate={{ width: `${awayShare}%` }}
                    transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1], delay: index * 0.04 }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
