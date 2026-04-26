"use client";

import { motion } from "framer-motion";
import type { LiveMatchStatsShape } from "@/lib/data/mock";

function StatRow({
  label,
  home,
  away,
}: {
  label: string;
  home: number;
  away: number;
}) {
  const total = home + away || 1;
  const homeShare = (home / total) * 100;
  const awayShare = (away / total) * 100;

  return (
    <div className="space-y-2.5">
      <p className="text-center text-[10px] font-medium uppercase tracking-widest text-white">
        {label}
      </p>
      <div className="flex items-center gap-2.5">
        <span className="w-8 shrink-0 text-right text-[13px] font-bold tabular-nums text-white/90">
          {home}
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-0">
          <div className="flex h-2 flex-1 justify-end overflow-hidden rounded-l-full bg-white/[0.07]">
            <motion.div
              className="h-full rounded-l-full bg-white/10"
              initial={{ width: 0 }}
              animate={{ width: `${homeShare}%` }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="flex h-2 flex-1 justify-start overflow-hidden rounded-r-full bg-white/[0.07]">
            <motion.div
              className="h-full rounded-r-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${awayShare}%` }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.04 }}
              style={{ boxShadow: "0 0 12px rgba(0, 240, 255, 0.22)" }}
            />
          </div>
        </div>
        <span className="w-8 shrink-0 text-left text-[13px] font-bold tabular-nums text-accent">
          {away}
        </span>
      </div>
    </div>
  );
}

type Props = {
  stats: LiveMatchStatsShape;
  className?: string;
  /** По умолчанию все три; для матч-центра можно оставить только владение и удары. */
  rows?: ("possession" | "shotsOnTarget" | "corners")[];
};

export default function MatchSpartakStats({
  stats,
  className = "",
  rows = ["possession", "shotsOnTarget", "corners"],
}: Props) {
  return (
    <div className={`mt-6 space-y-6 ${className}`}>
      {rows.includes("possession") ? (
        <StatRow
          label="Владение мячом"
          home={stats.possession.home}
          away={stats.possession.away}
        />
      ) : null}
      {rows.includes("shotsOnTarget") ? (
        <StatRow
          label="Удары в створ"
          home={stats.shotsOnTarget.home}
          away={stats.shotsOnTarget.away}
        />
      ) : null}
      {rows.includes("corners") ? (
        <StatRow
          label="Угловые"
          home={stats.corners.home}
          away={stats.corners.away}
        />
      ) : null}
    </div>
  );
}
