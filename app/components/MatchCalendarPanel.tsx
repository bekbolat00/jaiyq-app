"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Match } from "@/lib/types";
import TeamBadge from "@/app/components/TeamBadge";
import InviteFriendSheet from "@/app/components/InviteFriendSheet";
import MatchDetailSheet from "@/app/components/MatchDetailSheet";

const dateFmt = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function isMatchPast(kickoffAt: string) {
  return new Date(kickoffAt).getTime() < Date.now();
}

function MatchRow({
  match,
  index,
  onInvite,
  onMatchCenter,
}: {
  match: Match;
  index: number;
  onInvite: (m: Match) => void;
  onMatchCenter: (matchId: string) => void;
}) {
  const when = dateFmt.format(new Date(match.kickoffAt));
  const href = match.ticketUrl ?? "#";
  const past = isMatchPast(match.kickoffAt);

  return (
    <motion.li
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.07 * index, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass-premium rounded-3xl p-4"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
        {match.competition}
      </p>
      <p className="mt-1 text-[12px] font-semibold text-accent/90">{when}</p>
      <p className="mt-0.5 truncate text-[11px] text-muted">{match.venue}</p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <TeamBadge team={match.home} size="md" />
          <span className="truncate text-center text-[11px] font-bold uppercase tracking-wide text-foreground">
            {match.home.shortName}
          </span>
        </div>
        <span className="shrink-0 text-[10px] font-black text-white/25">VS</span>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <span className="truncate text-center text-[11px] font-bold uppercase tracking-wide text-foreground">
            {match.away.shortName}
          </span>
          <TeamBadge team={match.away} size="md" />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {past ? (
          <button
            type="button"
            onClick={() => onMatchCenter(match.id)}
            className="flex w-full items-center justify-center rounded-2xl border border-white/20 bg-white/5 py-3.5 text-center text-[13px] font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/[0.08] active:scale-[0.98]"
          >
            О МАТЧЕ
          </button>
        ) : (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="neon-cyan-surface flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#00f0ff] via-[#00d4ff] to-[#00a8e8] py-3.5 text-center text-[13px] font-black uppercase tracking-[0.12em] text-[#031014] shadow-[0_0_28px_rgba(0,240,255,0.55),0_0_48px_rgba(0,240,255,0.2)] transition-[transform,filter] active:scale-[0.98] active:brightness-95"
          >
            Купить билет
          </a>
        )}
        <button
          type="button"
          onClick={() => onInvite(match)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-center text-[13px] font-bold uppercase tracking-[0.1em] text-foreground transition-colors hover:bg-white/[0.08] active:scale-[0.99]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5 text-accent/90"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <path d="M20 8v6" />
            <path d="M23 11h-6" />
            <path d="M20 20v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.12a4 4 0 0 1 0 7.75" />
          </svg>
          Позвать друга
        </button>
      </div>
    </motion.li>
  );
}

export default function MatchCalendarPanel({ matches }: { matches: Match[] }) {
  const [inviteFor, setInviteFor] = useState<Match | null>(null);
  const [matchDetailId, setMatchDetailId] = useState<string | null>(null);

  return (
    <>
      <MatchDetailSheet
        open={matchDetailId !== null}
        onClose={() => setMatchDetailId(null)}
        matchId={matchDetailId}
      />
      <InviteFriendSheet
        open={inviteFor !== null}
        match={inviteFor}
        onClose={() => setInviteFor(null)}
      />
      <ul className="space-y-3">
        {matches.map((m, i) => (
          <MatchRow
            key={m.id}
            match={m}
            index={i}
            onInvite={setInviteFor}
            onMatchCenter={setMatchDetailId}
          />
        ))}
      </ul>
    </>
  );
}
