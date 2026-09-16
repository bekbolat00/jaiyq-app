import { cached, currentSeasonId, kffJson, ZHAIYQ_KFF_TEAM_ID } from "@/lib/kff/http";

/**
 * Профиль игрока Жайыка с kffleague.kz: физические данные, статистика
 * сезона и последние матчи. В нашей базе нет id игрока на KFF, поэтому
 * игрок находится в ростере по номеру и фамилии — так же, как в скриптах
 * импорта.
 */

type KffRosterItem = {
  id: number;
  first_name: string;
  last_name: string;
  number: number | null;
  birthday: string | null;
  photo_url: string | null;
  photo_url_player_page: string | null;
};

type KffPlayerDetail = {
  height: number | null;
  weight: number | null;
  age: number | null;
  birthday: string | null;
  /** «ЦП (центральный полузащитник)». */
  top_role: string | null;
  positions?: { primary?: string | null; secondary?: string[] | null } | null;
  photo_url_player_page: string | null;
  photo_url: string | null;
};

type KffSeasonStats = {
  games_played: number;
  games_starting: number;
  time_on_field_total: number;
  goal: number;
  goal_pass: number;
  xg: number | null;
  shot: number;
  shots_on_goal: number;
  passes: number;
  pass_ratio: number | null;
  key_pass: number;
  duel: number;
  duel_success: number;
  yellow_cards: number;
  red_cards: number;
} | null;

type KffMatchHistoryItem = {
  game_id: number;
  date: string;
  home_team: { id: number; name: string; logo_url: string | null; score: number | null };
  away_team: { id: number; name: string; logo_url: string | null; score: number | null };
  minutes_played: number;
  started: boolean;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
};

export type PlayerSeasonStats = {
  games: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  xg: number | null;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passAccuracy: number | null;
  keyPasses: number;
  duels: number;
  duelsWon: number;
  yellowCards: number;
  redCards: number;
};

export type PlayerMatch = {
  kffGameId: number;
  date: string;
  opponent: string;
  opponentLogo: string | null;
  isHome: boolean;
  zhaiyqScore: number | null;
  opponentScore: number | null;
  minutes: number;
  started: boolean;
  goals: number;
  assists: number;
  yellow: boolean;
  red: boolean;
};

export type PlayerProfile = {
  kffPlayerId: number;
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  /** `YYYY-MM-DD`. */
  birthDate: string | null;
  /** Роль на поле по данным KFF, например «Центральный полузащитник». */
  role: string | null;
  /** Большое фото для карточки, если есть. */
  photoUrl: string | null;
  seasonName: string;
  stats: PlayerSeasonStats | null;
  matches: PlayerMatch[];
};

export class PlayerNotFoundError extends Error {}

const LETTER_FOLD: Record<string, string> = {
  ё: "е", ұ: "у", ү: "у", ә: "а", і: "и", ғ: "г", қ: "к", ң: "н", ө: "о", һ: "х",
};

/** Ключ для сравнения фамилий: без регистра, казахские буквы сведены к русским. */
function nameKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ёұүәігқңөһ]/g, (c) => LETTER_FOLD[c] ?? c)
    .replace(/[^a-zа-я0-9]+/g, "");
}

function roster(seasonId: number) {
  return cached(`roster:${seasonId}`, 60 * 60_000, () =>
    kffJson<{ items: KffRosterItem[] }>(`/teams/${ZHAIYQ_KFF_TEAM_ID}/players?season_id=${seasonId}`).then(
      (d) => d.items ?? [],
    ),
  );
}

/** «ЦП (центральный полузащитник)» → «Центральный полузащитник». */
function humanRole(topRole: string | null): string | null {
  const m = topRole?.match(/\(([^)]+)\)/);
  const text = (m?.[1] ?? topRole ?? "").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : null;
}

export async function fetchPlayerProfile(number: string, surname: string): Promise<PlayerProfile> {
  const seasonId = await currentSeasonId();
  const items = await roster(seasonId);
  const key = nameKey(surname);
  const num = Number(number);

  const found =
    items.find((p) => Number(p.number) === num && nameKey(p.last_name).includes(key)) ??
    items.find((p) => key && nameKey(p.last_name) === key) ??
    null;
  if (!found) throw new PlayerNotFoundError(`player #${number} ${surname} not in KFF roster`);

  return cached(`profile:${found.id}:${seasonId}`, 60 * 60_000, async () => {
    const [detail, stats, history] = await Promise.all([
      kffJson<KffPlayerDetail>(`/players/${found.id}`),
      kffJson<KffSeasonStats>(`/players/${found.id}/stats?season_id=${seasonId}`),
      kffJson<{ items: KffMatchHistoryItem[] }>(`/players/${found.id}/match-history?season_id=${seasonId}`)
        .then((d) => d.items ?? [])
        .catch(() => [] as KffMatchHistoryItem[]),
    ]);

    const matches = history
      .map<PlayerMatch>((m) => {
        const isHome = m.home_team.id === ZHAIYQ_KFF_TEAM_ID;
        const opp = isHome ? m.away_team : m.home_team;
        const own = isHome ? m.home_team : m.away_team;
        return {
          kffGameId: m.game_id,
          date: m.date,
          opponent: opp.name,
          opponentLogo: opp.logo_url,
          isHome,
          zhaiyqScore: own.score,
          opponentScore: opp.score,
          minutes: m.minutes_played,
          started: m.started,
          goals: m.goals,
          assists: m.assists,
          yellow: m.yellow_cards > 0,
          red: m.red_cards > 0,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      kffPlayerId: found.id,
      heightCm: detail.height,
      weightKg: detail.weight,
      age: detail.age,
      birthDate: detail.birthday ?? found.birthday,
      role: humanRole(detail.top_role),
      photoUrl: detail.photo_url_player_page ?? found.photo_url_player_page ?? detail.photo_url ?? found.photo_url ?? null,
      seasonName: `Сезон ${new Date().getFullYear()}`,
      stats: stats
        ? {
            games: stats.games_played,
            starts: stats.games_starting,
            minutes: stats.time_on_field_total,
            goals: stats.goal,
            assists: stats.goal_pass,
            xg: stats.xg,
            shots: stats.shot,
            shotsOnTarget: stats.shots_on_goal,
            passes: stats.passes,
            passAccuracy: stats.pass_ratio,
            keyPasses: stats.key_pass,
            duels: stats.duel,
            duelsWon: stats.duel_success,
            yellowCards: stats.yellow_cards,
            redCards: stats.red_cards,
          }
        : null,
      matches,
    };
  });
}
