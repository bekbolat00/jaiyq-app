"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import FormationPitch from "@/app/components/FormationPitch";
import MatchDetailStatsPanel from "@/app/components/MatchDetailStatsPanel";
import MatchTimeline from "@/app/components/MatchTimeline";
import TeamBadge from "@/app/components/TeamBadge";
import {
  fetchMatchWithRelationsById,
  fetchPlayersForMatchTeams,
  fetchPredictionsStatsForMatch,
  fetchRecentFinishedMatches,
} from "@/lib/matches/fetchMatchFull";
import { lineBlocksFromPlayerRows } from "@/lib/matches/squadFromPlayerRows";
import {
  buildMatchDetailViewModel,
  type MatchDetailViewModel,
} from "@/lib/matches/matchDetailFromDb";
import { TEAM_ZHAIYQ } from "@/lib/constants/zhaiyq";
import type { DbMatchRow, Team } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

const TABS = [
  { id: "overview" as const, label: "ОБЗОР" },
  { id: "squads" as const, label: "СОСТАВ" },
  { id: "stats" as const, label: "СТАТИСТИКА" },
  { id: "recent" as const, label: "ПОСЛЕДНИЕ МАТЧИ" },
  { id: "vibe" as const, label: "ВАШЕ ЧУТЬЕ" },
  { id: "seers" as const, label: "ЭКСТРАСЕНСЫ" },
];

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const sheetVariants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring" as const, stiffness: 420, damping: 40 },
  },
  exit: { y: "100%", transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const } },
};

const panelTabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18 } },
};

function opponentTeamFromRow(row: DbMatchRow): Team {
  const url = row.logo_url?.trim() ?? "";
  return {
    id: `opponent-${row.id}`,
    shortName: row.opponent,
    fullName: row.opponent,
    logoUrl: url,
  };
}

/**
 * Счёт «слева / справа» в колонку для карточек «последние матчи».
 */
function matchMiniScore(
  row: DbMatchRow,
): { left: string; right: string; lTeam: string; rTeam: string; lid: string } {
  const opp = opponentTeamFromRow(row);
  const zs = row.zhaiyq_score ?? 0;
  const os = row.opponent_score ?? 0;
  if (row.is_home) {
    return {
      left: String(zs),
      right: String(os),
      lTeam: TEAM_ZHAIYQ.shortName,
      rTeam: opp.shortName,
      lid: row.id,
    };
  }
  return {
    left: String(os),
    right: String(zs),
    lTeam: opp.shortName,
    rTeam: TEAM_ZHAIYQ.shortName,
    lid: row.id,
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  matchId: string | null;
};

export default function MatchDetailSheet({ open, onClose, matchId }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const [loading, setLoading] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [vm, setVm] = useState<MatchDetailViewModel | null>(null);
  const [recent, setRecent] = useState<DbMatchRow[]>([]);
  const [vibe, setVibe] = useState<{
    count: number;
    avgHome: number | null;
    avgAway: number | null;
  }>({ count: 0, avgHome: null, avgAway: null });

  const runFetch = useCallback(
    async (id: string) => {
      setLoading(true);
      setFetchErr(null);
      if (!isSupabaseConfigured()) {
        setLoading(false);
        setFetchErr("Supabase не настроен: проверьте .env");
        return;
      }
      const { match, teams, error: e1 } = await fetchMatchWithRelationsById(
        id,
      );
      if (e1 || !match) {
        setLoading(false);
        setFetchErr(e1?.message ?? "Не удалось загрузить матч");
        setVm(null);
        return;
      }
      const mvm = buildMatchDetailViewModel(match, teams);
      let homeSquad = mvm.homeSquad;
      let awaySquad = mvm.awaySquad;
      if (mvm.homeId && mvm.awayId) {
        const { data: plRows, error: plErr } = await fetchPlayersForMatchTeams(
          mvm.homeId,
          mvm.awayId,
        );
        if (!plErr && plRows.length) {
          const split = lineBlocksFromPlayerRows(
            mvm.homeId,
            mvm.awayId,
            plRows,
            match.match_lineups,
          );
          homeSquad = split.home;
          awaySquad = split.away;
        }
      }
      setVm({ ...mvm, homeSquad, awaySquad });
      setLoading(false);

      const [rec, vs] = await Promise.all([
        fetchRecentFinishedMatches(id, 6),
        fetchPredictionsStatsForMatch(id),
      ]);
      setRecent(rec);
      setVibe({
        count: vs.count,
        avgHome: vs.avgHome,
        avgAway: vs.avgAway,
      });
    },
    [],
  );

  useEffect(() => {
    if (!open || !matchId) return;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    void runFetch(matchId);
  }, [open, matchId, runFetch]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => setTab("overview"));
  }, [open, matchId]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const showVm = vm;

  return (
    <AnimatePresence
      onExitComplete={() => {
        setVm(null);
        setFetchErr(null);
        setRecent([]);
        setVibe({ count: 0, avgHome: null, avgAway: null });
      }}
    >
      {open && matchId && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal
          aria-labelledby="match-center-title"
        >
          <motion.button
            type="button"
            className="absolute inset-0 z-0 bg-[#020408]/80 backdrop-blur-sm"
            aria-label="Закрыть"
            onClick={onClose}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          />
          <motion.aside
            className="glass-premium relative z-10 flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-b-0 border-white/10 border-white/8 bg-[#020408]/92 shadow-[0_-20px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(0,240,255,0.1)]"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/15" aria-hidden />

            {fetchErr && !showVm && !loading ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-rose-300/90">{fetchErr}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 text-xs font-bold uppercase text-accent"
                >
                  Закрыть
                </button>
              </div>
            ) : null}

            {loading && !showVm ? (
              <div className="flex flex-1 items-center justify-center p-8">
                <p className="text-sm font-bold uppercase tracking-widest text-white/35">
                  Матч-центр…
                </p>
              </div>
            ) : null}

            {showVm ? (
              <>
                <div className="shrink-0 border-b border-white/8 px-4 pb-3 pt-3">
                  <p
                    id="match-center-title"
                    className="text-center text-[9px] font-bold uppercase tracking-[0.2em] text-white/50"
                  >
                    {showVm.competition} · {showVm.statusLabel}
                  </p>

                  <div className="mt-4 flex items-stretch justify-between gap-1 sm:gap-3">
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                      <TeamBadge team={showVm.home} size="lg" />
                      <span className="line-clamp-2 text-[10px] font-black uppercase tracking-wide text-foreground/95">
                        {showVm.home.shortName}
                      </span>
                    </div>

                    <div className="flex shrink-0 flex-col items-center justify-center">
                      <div className="flex items-center gap-0.5 font-mono text-[clamp(1.8rem,8vw,2.75rem)] font-black leading-none tabular-nums text-accent [text-shadow:0_0_24px_rgba(0,240,255,0.3)]">
                        <motion.span
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                        >
                          {showVm.homeScore}
                        </motion.span>
                        <span className="px-0.5 pb-1 text-[0.45em] font-bold text-white/20">
                          :
                        </span>
                        <motion.span
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.05 }}
                        >
                          {showVm.awayScore}
                        </motion.span>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                      <TeamBadge team={showVm.away} size="lg" />
                      <span className="line-clamp-2 text-[10px] font-black uppercase tracking-wide text-foreground/95">
                        {showVm.away.shortName}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid min-h-10 grid-cols-1 gap-1.5 sm:grid-cols-2">
                    <p className="text-center text-[9px] leading-tight text-white/45 [text-wrap:balance]">
                      <span className="text-white/50">{showVm.home.shortName}:</span>{" "}
                      {showVm.homeScorers}
                    </p>
                    <p className="text-center text-[9px] leading-tight text-white/45 [text-wrap:balance]">
                      <span className="text-white/50">{showVm.away.shortName}:</span>{" "}
                      {showVm.awayScorers}
                    </p>
                  </div>
                </div>

                <div
                  className="no-scrollbar flex shrink-0 overflow-x-auto border-b border-white/10 px-1 py-1 [scrollbar-width:none]"
                  role="tablist"
                >
                  <div className="flex w-full min-w-0 flex-nowrap gap-0.5 pr-1">
                    {TABS.map((t) => {
                      const active = tab === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setTab(t.id)}
                          className={`relative min-w-0 flex-1 shrink-0 basis-[28%] whitespace-nowrap rounded-xl py-2.5 px-1.5 text-center text-[7px] font-extrabold uppercase tracking-tight transition-colors sm:px-2.5 sm:text-[8px] ${
                            active
                              ? "text-[#020408]"
                              : "text-white/50 hover:text-white/75"
                          } sm:basis-0 sm:shrink sm:text-[8px] md:text-[8px] lg:text-[8px] xl:[font-size:9px] whitespace-pre-wrap leading-tight`}
                        >
                          {active ? (
                            <motion.span
                              layoutId="matchDetailSheet-cyanPill"
                              className="absolute inset-0 z-0 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#00a8d6] shadow-[0_0_18px_rgba(0,240,255,0.4)]"
                              transition={{ type: "spring", stiffness: 400, damping: 34 }}
                            />
                          ) : null}
                          <span className="relative z-10 [text-shadow:none]">
                            {t.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:px-4">
                  <AnimatePresence mode="wait">
                    {tab === "overview" ? (
                      <motion.div
                        key="ov"
                        role="tabpanel"
                        variants={panelTabVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                      >
                        <div className="glass rounded-2xl p-3 sm:p-4">
                          {showVm.timeline.length ? (
                            <MatchTimeline events={showVm.timeline} heading="" />
                          ) : (
                            <p className="text-center text-[12px] text-white/40">
                              События появятся после обновления данных
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ) : null}
                    {tab === "squads" ? (
                      <motion.div
                        key="sq"
                        role="tabpanel"
                        variants={panelTabVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                      >
                        <FormationPitch
                          home={showVm.home}
                          away={showVm.away}
                          homeSquad={showVm.homeSquad}
                          awaySquad={showVm.awaySquad}
                        />
                      </motion.div>
                    ) : null}
                    {tab === "stats" ? (
                      <motion.div
                        key="st"
                        role="tabpanel"
                        variants={panelTabVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                      >
                        <div className="glass-premium rounded-2xl p-3 sm:p-4">
                          <MatchDetailStatsPanel
                            stats={showVm.stats}
                            homeName={showVm.home.shortName}
                            awayName={showVm.away.shortName}
                          />
                        </div>
                      </motion.div>
                    ) : null}
                    {tab === "recent" ? (
                      <motion.div
                        key="rc"
                        role="tabpanel"
                        variants={panelTabVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                      >
                        {recent.length === 0 ? (
                          <p className="text-center text-[12px] text-white/40">
                            Другие завершённые матчи появятся в ленте турнира
                          </p>
                        ) : (
                          <ul className="space-y-2.5">
                            {recent.map((r) => {
                              const s = matchMiniScore(r);
                              return (
                                <li
                                  key={s.lid}
                                  className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5"
                                >
                                  <p className="min-w-0 text-[8px] font-bold uppercase text-white/35 [text-wrap:balance] line-clamp-1">
                                    {r.competition}
                                  </p>
                                  <div className="flex min-w-0 items-center justify-end gap-2 text-right">
                                    <p className="line-clamp-1 text-[8px] font-extrabold text-white/55 sm:text-[9px]">
                                      {s.lTeam} · {s.rTeam}
                                    </p>
                                    <p className="shrink-0 font-mono text-[11px] font-bold tabular-nums text-accent">
                                      {s.left} : {s.right}
                                    </p>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </motion.div>
                    ) : null}
                    {tab === "vibe" ? (
                      <motion.div
                        key="vibe"
                        role="tabpanel"
                        variants={panelTabVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="space-y-4"
                      >
                        {vibe.count === 0 || vibe.avgHome == null || vibe.avgAway == null ? (
                          <p className="text-center text-[12px] leading-relaxed text-white/45 [text-wrap:balance]">
                            Средние ожидания от матча появятся, когда
                            прогнозы болельщиков будут в базе — сделайте
                            прогноз в «Zhaiyq Эксперт» на следующем туре.
                          </p>
                        ) : (
                          <div className="glass overflow-hidden rounded-2xl p-4">
                            <p className="text-center text-[9px] font-bold uppercase tracking-widest text-white/40">
                              Средний «чуй» толпы
                            </p>
                            <p className="mt-2 text-center font-mono text-3xl font-black tabular-nums text-accent">
                              {vibe.avgHome.toFixed(1)}{" "}
                              <span className="text-white/25">:</span>{" "}
                              {vibe.avgAway.toFixed(1)}
                            </p>
                            <p className="mt-1 text-center text-[10px] text-white/35">
                              {vibe.count}{" "}
                              {vibe.count === 1
                                ? "записанный прогноз"
                                : "записанных прогнозов"}{" "}
                              / матч
                            </p>
                            <p className="mt-3 text-center text-[10px] leading-relaxed text-white/45">
                              Данные: таблица{" "}
                              <span className="text-white/60">match_predictions</span>{" "}
                              (Supabase).
                            </p>
                          </div>
                        )}
                      </motion.div>
                    ) : null}
                    {tab === "seers" ? (
                      <motion.div
                        key="seers"
                        role="tabpanel"
                        variants={panelTabVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="space-y-3"
                      >
                        <p className="text-center text-[12px] leading-relaxed text-white/45 [text-wrap:balance]">
                          <span className="font-semibold text-white/60">
                            Экстрасенсы
                          </span>{" "}
                          — тот, кто чаще всего попадает в сетку
                          <span className="text-white/30">: </span>
                          точность сравниваем с итоговым счётом, когда
                          вступят поля <span className="text-white/55">score</span> в
                          прогнозах.
                        </p>
                        <div className="glass rounded-2xl p-4 text-center text-[10px] text-white/50">
                          Сейчас:{" "}
                          <span className="font-bold text-white/80">
                            {vibe.count}
                          </span>{" "}
                          {vibe.count === 1 ? "строка" : "строк"} в прогнозах на
                          этот матч. Лидерборд по метрике скоро подключим к
                          сравнению с реальным результатом.
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </>
            ) : null}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
