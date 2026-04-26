"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import FinishedMatchResultCard from "@/app/components/FinishedMatchResultCard";
import InviteFriendSheet from "@/app/components/InviteFriendSheet";
import NewsFeedPanel from "@/app/components/NewsFeedPanel";
import UpcomingMatchScheduleCard from "@/app/components/UpcomingMatchScheduleCard";
import { dbMatchRowToMatch } from "@/lib/matches/mapDbMatch";
import type { DbMatchRow } from "@/lib/types";

type Props = {
  onViewAllMatches: () => void;
  onExpertClick: (row: DbMatchRow) => void;
  loading: boolean;
  fetchError: string | null;
  upcomingMatches: DbMatchRow[];
  pastMatches: DbMatchRow[];
};

export default function MainTabPanel({
  onViewAllMatches,
  onExpertClick,
  loading,
  fetchError,
  upcomingMatches,
  pastMatches,
}: Props) {
  const [inviteOpen, setInviteOpen] = useState(false);

  const inviteMatch = useMemo(() => {
    const first = upcomingMatches[0];
    return first ? dbMatchRowToMatch(first) : null;
  }, [upcomingMatches]);

  const homeUpcoming = useMemo(() => upcomingMatches.slice(0, 3), [upcomingMatches]);
  const homePast = useMemo(() => pastMatches.slice(0, 8), [pastMatches]);

  const ticketHref = upcomingMatches[0]?.ticket_url?.trim() || "#";

  return (
    <>
      <InviteFriendSheet
        open={inviteOpen}
        match={inviteMatch}
        onClose={() => setInviteOpen(false)}
      />

      <div className="flex flex-col gap-8">
        <section aria-label="Предстоящие матчи">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-white/50">
            ПРЕДСТОЯЩИЕ МАТЧИ
          </h2>

          {loading ? (
            <div className="glass-premium flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-3xl p-8">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
              <p className="text-center text-xs font-bold uppercase tracking-wider text-white/45">
                Загрузка расписания…
              </p>
            </div>
          ) : fetchError ? (
            <p className="rounded-3xl border border-rose-500/25 bg-rose-500/5 p-6 text-center text-sm text-rose-100/90">
              {fetchError}
            </p>
          ) : homeUpcoming.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] py-10 text-center text-sm text-white/45">
              Нет предстоящих матчей
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {homeUpcoming.map((row, i) => (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.42,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.06 * i,
                  }}
                >
                  <UpcomingMatchScheduleCard
                    row={row}
                    index={i}
                    logoSize="lg"
                    onExpertClick={() => onExpertClick(row)}
                  />
                </motion.div>
              ))}

              <div className="grid grid-cols-2 gap-3 pt-1">
                {ticketHref !== "#" ? (
                  <Link
                    href={ticketHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="neon-cyan-surface flex items-center justify-center rounded-2xl bg-accent py-3.5 text-center text-[11px] font-black uppercase tracking-widest text-black shadow-[0_0_24px_rgba(0,240,255,0.45)] transition-[transform,filter] active:scale-[0.99] active:brightness-95 sm:text-xs"
                  >
                    КУПИТЬ БИЛЕТ
                  </Link>
                ) : (
                  <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/35">
                    Билеты скоро
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  disabled={!inviteMatch}
                  className="rounded-2xl border border-white/10 bg-white/5 py-3.5 text-center text-[11px] font-black uppercase tracking-widest text-foreground transition-colors hover:bg-white/[0.08] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs"
                >
                  ПОЗВАТЬ ДРУГА
                </button>
              </div>
            </div>
          )}
        </section>

        {homePast.length > 0 ? (
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
              {homePast.map((row, index) => (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.05 * index,
                  }}
                  className="min-w-[280px] shrink-0 snap-center"
                >
                  <FinishedMatchResultCard row={row} index={index} />
                </motion.div>
              ))}
            </div>
          </section>
        ) : null}

        <NewsFeedPanel />
      </div>
    </>
  );
}
