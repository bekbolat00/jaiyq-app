import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  COMPETITION_LABEL,
  fetchSeasonGames,
  fetchTeamSeasons,
  Importer,
  REQUEST_DELAY_MS,
  ZHAIYQ_KFF_TEAM_ID,
} from "@/scripts/importSeason.js";

/**
 * Сколько дней после матча продолжаем перечитывать его страницу на KFF:
 * протокол, составы и ссылка на видеообзор часто появляются или
 * исправляются не сразу после финального свистка.
 */
const RECHECK_FINISHED_DAYS = 3;

type KffGame = {
  id: number;
  date: string;
  time: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  season_name?: string;
  home_team?: { id: number; name: string } | null;
  away_team?: { id: number; name: string } | null;
};

type KffSeason = {
  season_id: number;
  season_year: number;
};

type MatchRow = {
  status?: string | null;
  zhaiyq_score?: number | null;
  opponent_score?: number | null;
};

export type SyncedGame = {
  kffGameId: number;
  label: string;
  /** created — новая строка в `matches`, updated — поменялся счёт/статус/дата, scraped — перечитаны составы и события. */
  action: "created" | "updated" | "scraped" | "unchanged" | "failed";
  error?: string;
};

export type SyncMatchesResult = {
  startedAt: string;
  finishedAt: string;
  seasons: number[];
  games: SyncedGame[];
  lineupsInserted: number;
  eventsInserted: number;
  teamsCreated: string[];
  warnings: string[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function gameLabel(g: KffGame): string {
  const score =
    g.home_score != null && g.away_score != null ? `${g.home_score}:${g.away_score}` : "–:–";
  return `${g.date} ${g.home_team?.name ?? "?"} ${score} ${g.away_team?.name ?? "?"}`;
}

function daysSince(dateIso: string): number {
  return (Date.now() - new Date(`${dateIso}T00:00:00Z`).getTime()) / 86_400_000;
}

/**
 * Турниры текущего года: лига и кубок на KFF — разные «сезоны».
 * Лиге оставляем подпись, под которой её матчи уже лежат в БД.
 */
async function currentSeasons(): Promise<{ id: number; competition: string | null }[]> {
  const [seasons, { seasonId: defaultId }] = await Promise.all([
    fetchTeamSeasons(ZHAIYQ_KFF_TEAM_ID) as Promise<KffSeason[]>,
    fetchSeasonGames(ZHAIYQ_KFF_TEAM_ID, null) as Promise<{ seasonId: number }>,
  ]);
  const year = seasons.find((s) => s.season_id === defaultId)?.season_year;
  const ids = seasons.filter((s) => s.season_year === year).map((s) => s.season_id);
  if (!ids.includes(defaultId)) ids.unshift(defaultId);
  return ids.map((id) => ({ id, competition: id === defaultId ? COMPETITION_LABEL : null }));
}

/**
 * Подтягивает матчи Жайыка с kffleague.kz в Supabase.
 *
 * Весь сезон при каждом запуске не перечитывается — функции Vercel
 * ограничены по времени, а KFF не стоит дёргать лишний раз. Список игр
 * (счёт, статус, дата) обновляется целиком: это один запрос на турнир.
 * Страницу матча со составами и событиями скачиваем, только если матч
 * закончился, а в БД он ещё не отмечен сыгранным, счёт расходится или
 * игра была недавно.
 */
export async function syncMatchesFromKff(): Promise<SyncMatchesResult> {
  const startedAt = new Date().toISOString();
  const supabase = getSupabaseAdminClient();
  const seasons = await currentSeasons();

  const games: SyncedGame[] = [];
  const totals = { lineupsInserted: 0, eventsInserted: 0 };
  const teamsCreated: string[] = [];
  const warnings: string[] = [];

  for (const season of seasons) {
    const { games: kffGames } = (await fetchSeasonGames(ZHAIYQ_KFF_TEAM_ID, season.id)) as {
      games: KffGame[];
    };

    const importer = new Importer(supabase, {
      dryRun: false,
      competition: season.competition ?? kffGames[0]?.season_name ?? null,
    });
    await importer.loadState();

    for (const game of kffGames) {
      const label = gameLabel(game);
      const isHome = game.home_team?.id === ZHAIYQ_KFF_TEAM_ID;
      const isFinished = game.status === "finished";
      const zhaiyqScore = isHome ? game.home_score : game.away_score;
      const opponentScore = isHome ? game.away_score : game.home_score;

      const before = importer.findMatchRow(
        game.date,
        null,
        isHome,
        isFinished ? "finished" : "upcoming",
        game.id,
      ) as MatchRow | null;

      const needsScrape =
        isFinished &&
        (!before ||
          before.status !== "finished" ||
          before.zhaiyq_score !== zhaiyqScore ||
          before.opponent_score !== opponentScore ||
          daysSince(game.date) <= RECHECK_FINISHED_DAYS);

      const updatedBefore = importer.summary.matchesUpdated;
      const createdBefore = importer.summary.matchesCreated.length;

      try {
        if (isFinished && !needsScrape) {
          // Старый сыгранный матч: только сверить строку (дата, соперник,
          // kff_game_id), страницу матча заново не качаем.
          const opponentKff = isHome ? game.away_team : game.home_team;
          const opponent = await importer.findOrCreateTeam(opponentKff?.name ?? "Соперник", null);
          await importer.upsertMatchRow(game, opponent, isHome, null);
        } else {
          await importer.importGame(game);
          if (needsScrape) await sleep(REQUEST_DELAY_MS);
        }

        const action: SyncedGame["action"] =
          importer.summary.matchesCreated.length > createdBefore
            ? "created"
            : importer.summary.matchesUpdated > updatedBefore
              ? "updated"
              : needsScrape
                ? "scraped"
                : "unchanged";
        games.push({ kffGameId: game.id, label, action });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        games.push({ kffGameId: game.id, label, action: "failed", error: message });
      }
    }

    totals.lineupsInserted += importer.summary.lineupsInserted;
    totals.eventsInserted += importer.summary.eventsInserted;
    teamsCreated.push(...importer.summary.teamsCreated);
    warnings.push(...importer.summary.warnings);
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    seasons: seasons.map((s) => s.id),
    games,
    ...totals,
    teamsCreated,
    warnings: [...new Set(warnings)],
  };
}
