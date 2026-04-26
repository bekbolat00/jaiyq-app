"use client";

import { motion } from "framer-motion";
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
};

export default function UpcomingMatchScheduleCard({
  row,
  index = 0,
  onExpertClick,
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

      <div className="flex items-center justify-between w-full px-2">
        <div className="flex-1 flex justify-start items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- local / remote logo URLs */}
          <img
            src={left.logoUrl ?? ""}
            alt=""
            className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0"
          />
        </div>
        <MatchScheduleCountdown target={row.match_date} />
        <div className="flex-1 flex justify-end items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- local / remote logo URLs */}
          <img
            src={right.logoUrl ?? ""}
            alt=""
            className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0"
          />
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
