"use client";

import { motion } from "framer-motion";
import TeamBadge from "@/app/components/TeamBadge";
import MatchScheduleCountdown from "@/app/components/MatchScheduleCountdown";
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

type Props = {
  row: DbMatchRow;
  index?: number;
  onExpertClick: () => void;
  logoSize?: "lg" | "xl";
};

export default function UpcomingMatchScheduleCard({
  row,
  index = 0,
  onExpertClick,
  logoSize = "xl",
}: Props) {
  const opp = opponentTeam(row);
  const left = row.is_home ? TEAM_ZHAIYQ : opp;
  const right = row.is_home ? opp : TEAM_ZHAIYQ;

  return (
    <motion.article
      role="listitem"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1], delay: 0.04 * index }}
      className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <p className="mb-4 text-center text-[10px] font-black uppercase tracking-[0.22em] text-white/50">
        {row.competition}
      </p>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <div className="flex min-w-0 flex-col items-center gap-2">
          <TeamBadge team={left} size={logoSize} />
        </div>
        <div className="min-w-0 shrink px-0.5 sm:max-w-[16rem]">
          <MatchScheduleCountdown target={row.match_date} />
        </div>
        <div className="flex min-w-0 flex-col items-center gap-2">
          <TeamBadge team={right} size={logoSize} />
        </div>
      </div>

      <button
        type="button"
        onClick={onExpertClick}
        className="neon-cyan-surface mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00f0ff] via-[#00d4ff] to-[#00a8e8] text-[11px] font-black uppercase tracking-[0.14em] text-[#031014] shadow-[0_0_24px_rgba(0,240,255,0.4)] transition-[transform,filter] active:scale-[0.99] active:brightness-95 sm:text-xs"
      >
        <span className="text-lg leading-none" aria-hidden>
          ⚡
        </span>
        ZHAIYQ ЭКСПЕРТ
      </button>
    </motion.article>
  );
}
