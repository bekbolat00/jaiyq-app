"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Countdown from "@/app/components/Countdown";
import ExpertPredictorSheet from "@/app/components/ExpertPredictorSheet";
import InviteFriendSheet from "@/app/components/InviteFriendSheet";
import MatchDetailSheet from "@/app/components/MatchDetailSheet";
import NewsFeedPanel from "@/app/components/NewsFeedPanel";
import TeamBadge from "@/app/components/TeamBadge";
import { getMatchCenterForMatch, HOME_CALENDAR_MATCHES } from "@/lib/data/mock";
import type { Match } from "@/lib/types";

type Props = {
  onViewAllMatches: () => void;
};

function formatUpcomingHeaderLine(match: Match): string {
  const d = new Date(match.kickoffAt);
  const dateStr = d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${dateStr} ${timeStr} • ${match.competition.toUpperCase()}`;
}

function formatPastCardDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function MainTabPanel({ onViewAllMatches }: Props) {
  const nextMatch = HOME_CALENDAR_MATCHES[0]!;
  const ticketHref = nextMatch.ticketUrl ?? "#";

  const [inviteOpen, setInviteOpen] = useState(false);
  const [expertSheetOpen, setExpertSheetOpen] = useState(false);
  const [expertNextMatchDone, setExpertNextMatchDone] = useState(false);
  const [sheetMatch, setSheetMatch] = useState<Match | null>(null);
  const sheetDetail = sheetMatch ? getMatchCenterForMatch(sheetMatch) : null;

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const isDone = localStorage.getItem("expert_v2");
        if (isDone === "true") setExpertNextMatchDone(true);
      } catch {
        /* ignore */
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  const pastMatches = useMemo(
    () =>
      HOME_CALENDAR_MATCHES.filter((m) => m.finalScore != null).sort(
        (a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime(),
      ),
    [],
  );

  return (
    <>
      <MatchDetailSheet
        open={sheetMatch !== null}
        onClose={() => setSheetMatch(null)}
        detail={sheetDetail}
      />
      <InviteFriendSheet
        open={inviteOpen}
        match={nextMatch}
        onClose={() => setInviteOpen(false)}
      />
      <ExpertPredictorSheet
        open={expertSheetOpen}
        onClose={() => setExpertSheetOpen(false)}
        onCompleted={() => setExpertNextMatchDone(true)}
      />

      <div className="flex flex-col gap-8">
        <section aria-label="Предстоящий матч">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-white/50">
            ПРЕДСТОЯЩИЙ МАТЧ
          </h2>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="glass-premium rounded-3xl p-6 shadow-[0_0_48px_rgba(0,240,255,0.08)]"
          >
            <p className="text-center text-xs font-semibold leading-snug text-foreground/85">
              {formatUpcomingHeaderLine(nextMatch)}
            </p>

            <div className="mt-8 flex items-center justify-center gap-4 sm:gap-6">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <TeamBadge team={nextMatch.home} size="xl" />
              </div>
              <span
                className="shrink-0 text-xs font-black uppercase tracking-[0.35em] text-white/30"
                aria-hidden
              >
                VS
              </span>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <TeamBadge team={nextMatch.away} size="xl" />
              </div>
            </div>

            <div className="mt-8">
              <Countdown target={nextMatch.kickoffAt} />
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <Link
                href={ticketHref}
                target="_blank"
                rel="noopener noreferrer"
                className="neon-cyan-surface flex items-center justify-center rounded-2xl bg-accent py-3.5 text-center text-[11px] font-black uppercase tracking-widest text-black shadow-[0_0_24px_rgba(0,240,255,0.45)] transition-[transform,filter] active:scale-[0.99] active:brightness-95 sm:text-xs"
              >
                КУПИТЬ БИЛЕТ
              </Link>
              {expertNextMatchDone ? (
                <div
                  className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-2xl border border-accent/25 bg-accent/10 py-3.5 text-center text-[10px] font-black uppercase leading-tight tracking-widest text-accent opacity-50 sm:text-[11px]"
                  aria-disabled
                >
                  <span className="text-center">
                    ПРОГНОЗ СДЕЛАН <span aria-hidden>✅</span>
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setExpertSheetOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-accent bg-accent/10 py-3.5 text-center text-[10px] font-black uppercase tracking-widest text-accent shadow-[0_0_20px_rgba(0,240,255,0.2)] transition-[transform,box-shadow] hover:bg-accent/15 hover:shadow-[0_0_28px_rgba(0,240,255,0.28)] active:scale-[0.99] sm:text-[11px]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 shrink-0 neon-cyan sm:h-[18px] sm:w-[18px]"
                    aria-hidden
                  >
                    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  ZHAIYQ ЭКСПЕРТ
                </button>
              )}
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="col-span-2 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-center text-[11px] font-black uppercase tracking-widest text-foreground transition-colors hover:bg-white/[0.08] active:scale-[0.99] sm:text-xs"
              >
                ПОЗВАТЬ ДРУГА
              </button>
            </div>
          </motion.div>
        </section>

        {pastMatches.length > 0 ? (
          <section aria-label="Прошедшие матчи">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-white/50">
                ПРОШЕДШИЕ МАТЧИ
              </h2>
              <button
                type="button"
                onClick={onViewAllMatches}
                className="shrink-0 text-xs font-bold uppercase tracking-wider text-accent transition-opacity hover:opacity-90"
              >
                Все матчи &gt;
              </button>
            </div>
            <div className="flex snap-x gap-4 overflow-x-auto pb-4 [-webkit-overflow-scrolling:touch] hide-scrollbar">
              {pastMatches.map((m, index) => {
                const score = m.finalScore!;
                return (
                  <motion.button
                    key={m.id}
                    type="button"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.05 * index,
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSheetMatch(m)}
                    className="min-w-[280px] snap-center rounded-2xl text-left"
                  >
                    <div className="glass-premium h-full rounded-2xl p-4 shadow-[0_0_32px_rgba(0,240,255,0.06)] transition-[box-shadow] hover:shadow-[0_0_40px_rgba(0,240,255,0.12)]">
                      <p className="text-center text-[11px] font-bold uppercase tracking-wide text-muted">
                        {formatPastCardDate(m.kickoffAt)}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <TeamBadge team={m.home} size="md" />
                        <p className="shrink-0 text-2xl font-black tabular-nums tracking-tight text-foreground">
                          {score.home} : {score.away}
                        </p>
                        <TeamBadge team={m.away} size="md" />
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>
        ) : null}

        <NewsFeedPanel />
      </div>
    </>
  );
}
