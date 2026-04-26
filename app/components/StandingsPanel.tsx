"use client";

import { motion } from "framer-motion";
import type { StandingRow } from "@/lib/data/mock";
import TeamBadge from "@/app/components/TeamBadge";

export default function StandingsPanel({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="glass-premium flex max-h-[60vh] flex-col overflow-hidden rounded-3xl">
      <div className="grid shrink-0 grid-cols-[2.5rem_1fr_2.5rem_2.5rem] gap-2 border-b border-white/10 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted">
        <span className="text-center">#</span>
        <span>Команда</span>
        <span className="text-center">И</span>
        <span className="text-center">О</span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        {rows.map((row, i) => {
          const isZhaiyq = row.team.id === "zhaiyq";
          return (
            <motion.li
              key={row.team.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.35 }}
              className={`grid grid-cols-[2.5rem_1fr_2.5rem_2.5rem] gap-2 border-b border-white/[0.06] px-3 py-3 text-[13px] last:border-0 ${
                isZhaiyq
                  ? "relative bg-[#00f0ff]/[0.08] shadow-[inset_0_0_0_1px_rgba(0,240,255,0.35),0_0_24px_rgba(0,240,255,0.18)]"
                  : ""
              }`}
            >
              <span
                className={`text-center font-mono tabular-nums ${
                  isZhaiyq ? "font-bold text-accent neon-cyan" : "text-muted"
                }`}
              >
                {row.place}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <TeamBadge team={row.team} size="sm" logoVariant="standings" />
                <span
                  className={`min-w-0 truncate font-bold uppercase tracking-wide ${
                    isZhaiyq ? "text-foreground neon-cyan" : "text-foreground/85"
                  }`}
                >
                  {row.team.shortName}
                </span>
              </span>
              <span className="text-center font-mono tabular-nums text-muted">
                {row.played}
              </span>
              <span
                className={`text-center font-mono font-bold tabular-nums ${
                  isZhaiyq ? "text-accent" : "text-foreground"
                }`}
              >
                {row.points}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
