"use client";

import { displayCase, sentenceCase } from "@/lib/text/displayCase";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ChevronDown,
  Clock,
  History,
  Loader2,
  Play,
  UsersRound,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { outcomeFor, ResultBadge } from "@/app/components/ui/Badges";
import Button from "@/app/components/ui/Button";
import Crest from "@/app/components/ui/Crest";
import EmptyState from "@/app/components/ui/EmptyState";
import Tabs from "@/app/components/ui/Tabs";
import FormationPitch from "@/app/components/FormationPitch";
import MatchDetailStatsPanel from "@/app/components/MatchDetailStatsPanel";
import MatchTimeline from "@/app/components/MatchTimeline";
import {
  fetchMatchWithRelationsById,
  fetchPredictionsStatsForMatch,
  fetchRecentFinishedMatches,
} from "@/lib/matches/fetchMatchFull";
import { lineBlocksFromPlayerRows } from "@/lib/matches/squadFromPlayerRows";
import {
  buildMatchDetailViewModel,
  buildRichTimeline,
  computeHalfTimeScore,
  findTeamByOpponentName,
  isZhaiyqTeamName,
  type MatchDetailViewModel,
} from "@/lib/matches/matchDetailFromDb";
import { TEAM_ZHAIYQ } from "@/lib/constants/zhaiyq";
import type { DbMatchRow, DbPlayerRow, DbTeamRow, Team } from "@/lib/types";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const TABS = [
  { id: "overview" as const, label: "Обзор" },
  { id: "squads" as const, label: "Состав" },
  { id: "stats" as const, label: "Статистика" },
  { id: "recent" as const, label: "Последние" },
];



function hasValue(v: string | null | undefined): boolean {
  const s = (v ?? "").trim();
  return s !== "" && s !== "—";
}

function pluralPredictions(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "прогноз";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "прогноза";
  return "прогнозов";
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

const panelTabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] as const },
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
const DEFAULT_HOME_KIT = "#00AEEF";
const DEFAULT_AWAY_KIT = "#F5C518";

function kitColorsForMatch(
  teams: DbTeamRow[],
  matchHomeTeamId: string,
  matchAwayTeamId: string,
): { homeKit: string; awayKit: string } {
  const h = teams.find((t) => t.id === matchHomeTeamId);
  const a = teams.find((t) => t.id === matchAwayTeamId);
  return {
    homeKit: (h?.home_color ?? "").trim() || DEFAULT_HOME_KIT,
    awayKit: (a?.away_color ?? "").trim() || DEFAULT_AWAY_KIT,
  };
}

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
  useTelegramBackButton(open, onClose);
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
  const [pitchKits, setPitchKits] = useState({
    home: DEFAULT_HOME_KIT,
    away: DEFAULT_AWAY_KIT,
  });

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
      let timeline = mvm.timeline;
      let htScore = mvm.htScore;
      let homeTeamId = match.home_team_id?.trim() || mvm.homeId || "";
      let awayTeamId = match.away_team_id?.trim() || mvm.awayId || "";

      if (!homeTeamId || !awayTeamId) {
        const { data: tAll, error: tErr } = await supabase
          .from("teams")
          .select("*");
        const trows = (tAll ?? []) as DbTeamRow[];
        // Схема `matches` упрощённая: нет надёжных home_team_id/away_team_id,
        // есть только `is_home` (флаг «Жайык дома») + `opponent` (текст).
        // «Жайык» в `teams` есть всегда — его сторону резолвим и
        // показываем независимо от соперника. Соперника ищем по названию,
        // но если для него нет строки в `teams` (частый случай), просто
        // оставляем его сторону пустой вместо того, чтобы ронять состав
        // «Жайыка» тоже.
        if (!tErr) {
          const z = trows.find((t) => isZhaiyqTeamName(t)) ?? null;
          const oth = match.opponent
            ? findTeamByOpponentName(trows, match.opponent, z?.id)
            : null;
          if (z) {
            homeTeamId = match.is_home ? z.id : oth?.id ?? "";
            awayTeamId = match.is_home ? oth?.id ?? "" : z.id;
          }
        }
      }

      const kitSource =
        homeTeamId && awayTeamId
          ? ((
              await supabase
                .from("teams")
                .select("*")
                .in("id", [homeTeamId, awayTeamId])
            ).data ?? []) as DbTeamRow[]
          : teams;
      const kits = kitColorsForMatch(kitSource, homeTeamId, awayTeamId);
      setPitchKits({ home: kits.homeKit, away: kits.awayKit });

      const teamIdsForPlayers = [...new Set([homeTeamId, awayTeamId].filter(Boolean))];
      if (teamIdsForPlayers.length) {
        const { data: players, error: plErr } = await supabase
          .from("players")
          .select("*")
          .in("team_id", teamIdsForPlayers);
        const plRows = (players ?? []) as DbPlayerRow[];
        if (!plErr && plRows.length) {
          // `lineBlocksFromPlayerRows` фильтрует игроков по team_id —
          // пустая сторона (нет команды-соперника в `teams`) просто даёт
          // пустой LineBlock и не мешает показать реальный состав «Жайыка».
          const split = lineBlocksFromPlayerRows(
            homeTeamId,
            awayTeamId,
            plRows,
            match.match_lineups,
          );
          homeSquad = split.home;
          awaySquad = split.away;
        }
        if (!plErr && match.match_events?.length) {
          // `match_events(*)` не джойнит игрока — имена для таймлайна
          // берём из уже загруженных `plRows` (players обеих команд).
          const playersById = new Map(plRows.map((p) => [p.id, p]));
          timeline = buildRichTimeline(
            match.match_events,
            playersById,
            homeTeamId || null,
            awayTeamId || null,
          );
          htScore = computeHalfTimeScore(
            match.match_events,
            homeTeamId || null,
            awayTeamId || null,
          );
        }
      }
      setVm({ ...mvm, homeSquad, awaySquad, timeline, htScore });
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
  const statusCaption = showVm ? sentenceCase(showVm.statusLabel) : "";
  const hasScorers =
    showVm != null && (hasValue(showVm.homeScorers) || hasValue(showVm.awayScorers));
  const videoLinks = showVm
    ? [
        showVm.fullMatchUrl
          ? { url: showVm.fullMatchUrl, label: "Трансляция", icon: <Play className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden /> }
          : null,
        showVm.highlightUrl
          ? { url: showVm.highlightUrl, label: "Видеообзор", icon: <Video className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden /> }
          : null,
      ].filter((v): v is NonNullable<typeof v> => v != null)
    : [];

  return (
    <AnimatePresence
      onExitComplete={() => {
        setVm(null);
        setFetchErr(null);
        setRecent([]);
        setVibe({ count: 0, avgHome: null, avgAway: null });
        setPitchKits({ home: DEFAULT_HOME_KIT, away: DEFAULT_AWAY_KIT });
      }}
    >
      {open && matchId && (
        <motion.div
          key={matchId}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          style={{ position: "fixed", inset: 0, zIndex: 50 }}
          className="flex flex-col overflow-hidden bg-background"
          role="dialog"
          aria-modal
          aria-labelledby="match-center-title"
        >
          <header className="flex shrink-0 items-center gap-1 px-2 pb-1 pt-[max(0.5rem,env(safe-area-inset-top))]">
            <button
              type="button"
              aria-label="Закрыть"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-foreground transition-colors active:bg-surface-2"
            >
              <ChevronDown className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </button>
            <p
              id="match-center-title"
              className="t-label min-w-0 flex-1 truncate text-center text-subtle"
            >
              {showVm ? showVm.competition : "Матч-центр"}
            </p>
            <span className="w-11 shrink-0" aria-hidden />
          </header>

          {fetchErr && !showVm && !loading ? (
            <div className="flex flex-1 flex-col justify-center overflow-y-auto px-4 pb-16">
              <EmptyState
                icon={<AlertCircle className="h-6 w-6" strokeWidth={1.75} />}
                title="Не удалось открыть матч"
                description={fetchErr}
                action={
                  <Button variant="secondary" size="md" onClick={onClose}>
                    Закрыть
                  </Button>
                }
              />
            </div>
          ) : null}

          {loading && !showVm ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted" strokeWidth={1.75} aria-hidden />
              <p className="t-small text-muted">Загружаем матч</p>
            </div>
          ) : null}

          {showVm ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 px-4 pb-4 pt-3">
                <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
                  <div className="flex min-w-0 flex-col items-center gap-2.5 text-center">
                    <Crest src={showVm.home.logoUrl} alt="" size={56} />
                    <span className="t-h3 line-clamp-2 text-foreground [overflow-wrap:anywhere]">
                      {displayCase(showVm.home.shortName)}
                    </span>
                  </div>

                  <div className="flex min-w-[96px] flex-col items-center pt-1.5">
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                      className="t-display whitespace-nowrap text-foreground"
                      aria-label={`Счёт ${showVm.homeScore}:${showVm.awayScore}`}
                    >
                      {showVm.homeScore}
                      <span className="px-1 text-subtle">:</span>
                      {showVm.awayScore}
                    </motion.p>
                    {statusCaption ? (
                      <p className="t-caption mt-1 text-muted">{statusCaption}</p>
                    ) : null}
                  </div>

                  <div className="flex min-w-0 flex-col items-center gap-2.5 text-center">
                    <Crest src={showVm.away.logoUrl} alt="" size={56} />
                    <span className="t-h3 line-clamp-2 text-foreground [overflow-wrap:anywhere]">
                      {displayCase(showVm.away.shortName)}
                    </span>
                  </div>
                </div>

                {hasScorers ? (
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <p className="t-small text-center text-muted [text-wrap:balance]">
                      {hasValue(showVm.homeScorers) ? showVm.homeScorers : ""}
                    </p>
                    <p className="t-small text-center text-muted [text-wrap:balance]">
                      {hasValue(showVm.awayScorers) ? showVm.awayScorers : ""}
                    </p>
                  </div>
                ) : null}

                {videoLinks.length ? (
                  <div className={`mt-5 grid gap-2 ${videoLinks.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                    {videoLinks.map((v) => (
                      <Button
                        key={v.label}
                        variant="secondary"
                        size="md"
                        fullWidth
                        icon={v.icon}
                        onClick={() => window.open(v.url, "_blank", "noopener,noreferrer")}
                      >
                        {v.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>

              <Tabs
                layoutId="match-detail-tabs"
                value={tab}
                onChange={setTab}
                tabs={TABS}
                className="mx-4 shrink-0"
              />

              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
                <AnimatePresence mode="wait">
                  {tab === "overview" ? (
                    <motion.div
                      key="ov"
                      role="tabpanel"
                      variants={panelTabVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="flex flex-col gap-3"
                    >
                      {showVm.timeline.length ? (
                        <div className="card px-3 py-2">
                          <MatchTimeline
                            events={showVm.timeline}
                            htScore={showVm.htScore}
                            finalScore={{ home: showVm.homeScore, away: showVm.awayScore }}
                            heading=""
                          />
                        </div>
                      ) : (
                        <div className="card">
                          <EmptyState
                            icon={<Clock className="h-6 w-6" strokeWidth={1.75} />}
                            title="Событий пока нет"
                            description="Голы, карточки и замены появятся после обновления данных"
                          />
                        </div>
                      )}

                      {vibe.count > 0 && vibe.avgHome != null && vibe.avgAway != null ? (
                        <div className="card flex items-center gap-4 p-4">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
                            <UsersRound className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="t-body text-foreground">Прогноз болельщиков</p>
                            <p className="t-small text-muted">
                              {vibe.count} {pluralPredictions(vibe.count)} · средний счёт
                            </p>
                          </div>
                          <p className="t-h3 shrink-0 tabular-nums text-foreground">
                            {vibe.avgHome.toFixed(1)}
                            <span className="px-0.5 text-subtle">:</span>
                            {vibe.avgAway.toFixed(1)}
                          </p>
                        </div>
                      ) : null}
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
                        homeKitColor={pitchKits.home}
                        awayKitColor={pitchKits.away}
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
                      <MatchDetailStatsPanel
                        stats={showVm.stats}
                        homeName={displayCase(showVm.home.shortName)}
                        awayName={displayCase(showVm.away.shortName)}
                      />
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
                        <div className="card">
                          <EmptyState
                            icon={<History className="h-6 w-6" strokeWidth={1.75} />}
                            title="Других матчей пока нет"
                            description="Сыгранные матчи турнира появятся здесь"
                          />
                        </div>
                      ) : (
                        <ul className="card divide-y divide-line overflow-hidden">
                          {recent.map((r) => {
                            const s = matchMiniScore(r);
                            const outcome = outcomeFor(r.zhaiyq_score, r.opponent_score);
                            return (
                              <li
                                key={s.lid}
                                className="flex min-h-[64px] items-center gap-3 px-4 py-3"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="t-body truncate text-foreground">
                                    {displayCase(s.lTeam)} — {displayCase(s.rTeam)}
                                  </p>
                                  <p className="t-small truncate text-muted">
                                    {[r.competition, formatShortDate(r.match_date)].filter(Boolean).join(" · ")}
                                  </p>
                                </div>
                                <span className="t-h3 shrink-0 tabular-nums text-foreground">
                                  {s.left}:{s.right}
                                </span>
                                {outcome ? <ResultBadge outcome={outcome} /> : null}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
