"use client";

import { motion } from "framer-motion";
import TeamBadge from "@/app/components/TeamBadge";
import { TEAM_ZHAIYQ } from "@/lib/constants/zhaiyq";
import type { DbMatchRow } from "@/lib/types";
import type { Team } from "@/lib/types";

function opponentTeam(row: DbMatchRow): Team {
  const url = row.logo_url?.trim() ?? "";
  return {
    id: `opponent-${row.id}`,
    shortName: row.opponent,
    fullName: row.opponent,
    logoUrl: url,
  };
}

function formatResultDate(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function displayScore(row: DbMatchRow): { left: number; right: number; leftTeam: Team; rightTeam: Team } {
  const opp = opponentTeam(row);
  const zh = TEAM_ZHAIYQ;
  const zs = row.zhaiyq_score ?? 0;
  const os = row.opponent_score ?? 0;
  if (row.is_home) {
    return { left: zs, right: os, leftTeam: zh, rightTeam: opp };
  }
  return { left: os, right: zs, leftTeam: opp, rightTeam: zh };
}

type Props = {
  row: DbMatchRow;
  index?: number;
  /** Кнопка «О МАТЧЕ» (матч-центр). */
  onAboutMatch?: () => void;
};

export default function FinishedMatchResultCard({ row, index = 0, onAboutMatch }: Props) {
  const { left, right, leftTeam, rightTeam } = displayScore(row);
  const details = row.match_details?.trim();

  return (
    <motion.article
      role="listitem"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1], delay: 0.04 * index }}
      className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div className="mb-1 flex flex-col gap-0.5 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
          {row.competition}
        </p>
        <p className="text-[11px] font-semibold text-white/70">{formatResultDate(row.match_date)}</p>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <TeamBadge team={leftTeam} size="lg" />
        </div>
        <p className="shrink-0 text-2xl font-black tabular-nums tracking-tight text-accent">
          {left} <span className="text-white/35">:</span> {right}
        </p>
        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <TeamBadge team={rightTeam} size="lg" />
        </div>
      </div>

      {details ? (
        <p className="mt-3 text-center text-[10px] leading-relaxed text-white/40">{details}</p>
      ) : null}

      {onAboutMatch ? (
        <button
          type="button"
          onClick={onAboutMatch}
          className="mt-3 flex w-full items-center justify-center rounded-2xl border border-white/14 bg-gradient-to-b from-white/[0.11] to-white/[0.04] py-2.5 text-center text-[11px] font-black uppercase tracking-[0.14em] text-white/90 transition-[transform,box-shadow,background-color] [box-shadow:0_0_20px_rgba(0,240,255,0.12)] hover:border-accent/30 hover:from-white/[0.16] active:scale-[0.99]"
        >
          О МАТЧЕ
        </button>
      ) : null}
    </motion.article>
  );
}
