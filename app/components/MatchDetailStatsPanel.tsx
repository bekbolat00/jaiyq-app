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
  { key: "yellowCards", label: "ЖК", format: "int" },
  { key: "saves", label: "Сэйвы", format: "int" },
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

export default function MatchDetailStatsPanel({
  stats,
  homeName,
  awayName,
}: Props) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-2 rounded-2xl bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,240,255,0.06),transparent_60%)]" />
      <div className="relative space-y-6">
        <p className="text-center text-[8px] font-black uppercase tracking-[0.22em] text-white/40">
          Сравнение по матчу
        </p>

        <div className="flex items-end justify-between gap-3 px-0.5">
          <span className="min-w-0 truncate text-left text-[10px] font-bold uppercase tracking-wide text-white/50">
            {homeName}
          </span>
          <span className="min-w-0 truncate text-right text-[10px] font-bold uppercase tracking-wide text-cyan-400/80">
            {awayName}
          </span>
        </div>

        {STAT_ROWS.map((row, index) => {
          const pair = stats[row.key];
          const home = pair.home;
          const away = pair.away;
          const total = home + away || 1;
          const homeShare = (home / total) * 100;
          const awayShare = (away / total) * 100;

          return (
            <div key={row.key} className="space-y-2">
              <p className="text-center text-sm text-white/70">{row.label}</p>

              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-lg font-bold tabular-nums text-white">
                  {formatValue(home, row.format)}
                </span>
                <span className="shrink-0 text-lg font-bold tabular-nums text-cyan-400">
                  {formatValue(away, row.format)}
                </span>
              </div>

              <div className="flex h-2 w-full overflow-hidden rounded-full bg-black/35 ring-1 ring-inset ring-white/[0.06]">
                <div className="relative flex h-full w-1/2 justify-end overflow-hidden rounded-l-full">
                  <motion.div
                    className="h-full max-w-full rounded-l-full bg-gradient-to-l from-orange-500/95 via-rose-500/55 to-transparent"
                    initial={{ width: 0 }}
                    animate={{ width: `${homeShare}%` }}
                    transition={{
                      duration: 0.75,
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.06 + index * 0.07,
                    }}
                  />
                </div>
                <div className="relative flex h-full w-1/2 justify-start overflow-hidden rounded-r-full">
                  <motion.div
                    className="h-full max-w-full rounded-r-full bg-gradient-to-r from-cyan-400/95 via-cyan-500/50 to-transparent"
                    initial={{ width: 0 }}
                    animate={{ width: `${awayShare}%` }}
                    transition={{
                      duration: 0.75,
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.1 + index * 0.07,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
