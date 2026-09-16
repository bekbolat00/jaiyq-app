/**
 * Живое состояние игры на kffleague.kz: счёт, минута, фаза и голы.
 *
 * Логика «идёт ли матч» и подписи минуты повторяет фронтенд самого KFF
 * (там матч живой при `is_live` или `status === "live"`, `half` 3–4 —
 * дополнительное время, 5 или `live_phase === "shootout"` — пенальти).
 */

const API_BASE = "https://kffleague.kz/api/v1";
const USER_AGENT =
  "Mozilla/5.0 (compatible; ZhaiyqAppMatchScraper/1.0; +https://kffleague.kz/ru/matches)";

export const ZHAIYQ_KFF_TEAM_ID = 633;

type KffGameDetail = {
  id: number;
  status: string;
  is_live: boolean;
  minute: number | null;
  half: number | null;
  live_phase: string | null;
  show_timeline?: boolean;
  home_penalty_score?: number | null;
  away_penalty_score?: number | null;
  home_team: { id: number; name: string; score: number | null };
  away_team: { id: number; name: string; score: number | null };
};

type KffEvent = {
  id: number;
  half: number | null;
  minute: number;
  event_type: string;
  team_id: number;
  player_name: string | null;
};

export type LiveGoal = {
  id: number;
  minute: number;
  side: "home" | "away";
  playerName: string;
  ownGoal: boolean;
};

export type LiveGameState = {
  kffGameId: number;
  /** upcoming — ещё не начался, live — идёт, finished — финальный свисток. */
  phase: "upcoming" | "live" | "finished";
  /** «67'», «45+», «Перерыв», «ОТ 105'», «Пен.» — null, если матч не идёт. */
  clockLabel: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  goals: LiveGoal[];
};

export class NotZhaiyqGameError extends Error {}

const GOAL_EVENT_TYPES = new Set(["goal", "own_goal", "penalty"]);

function clockLabel(g: KffGameDetail): string {
  if (g.live_phase === "halftime") return "Перерыв";
  if (g.live_phase === "shootout" || g.half === 5) return "Пен.";
  const m = g.minute;
  if (g.show_timeline === false || m == null) return "LIVE";
  if (g.half === 1 && m > 45) return "45+";
  if (g.half === 2 && m > 90) return "90+";
  if (g.half === 3 || g.half === 4) return `ОТ ${m}'`;
  return `${m}'`;
}

async function kffJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`KFF ${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchLiveGame(kffGameId: number): Promise<LiveGameState> {
  const game = await kffJson<KffGameDetail>(`/games/${kffGameId}?lang=ru`);

  // Прокси открыт без авторизации — не даём гонять через него чужие игры.
  if (game.home_team?.id !== ZHAIYQ_KFF_TEAM_ID && game.away_team?.id !== ZHAIYQ_KFF_TEAM_ID) {
    throw new NotZhaiyqGameError(`game ${kffGameId} is not a Zhaiyq game`);
  }

  const isLive = game.is_live || game.status === "live";
  const phase: LiveGameState["phase"] = isLive
    ? "live"
    : game.status === "finished"
      ? "finished"
      : "upcoming";

  let goals: LiveGoal[] = [];
  if (phase !== "upcoming") {
    try {
      const { events } = await kffJson<{ events: KffEvent[] }>(`/live/events/${kffGameId}?lang=ru`);
      // У KFF забитый мяч — это goal, own_goal и penalty (реализованный
      // пенальти: игра 1224 закончилась 2:2 при двух goal и двух penalty).
      goals = (events ?? [])
        .filter((e) => GOAL_EVENT_TYPES.has(e.event_type))
        .map((e) => {
          const ownGoal = e.event_type === "own_goal";
          // Для автогола `team_id` — команда того, кто забил в свои ворота
          // (игра 1294: автогол «Шахтёра» дал Жайыку единственный мяч в 1:2),
          // значит мяч засчитывается сопернику.
          const byHomePlayer = e.team_id === game.home_team.id;
          const side: LiveGoal["side"] = byHomePlayer !== ownGoal ? "home" : "away";
          return {
            id: e.id,
            minute: e.minute,
            side,
            playerName: e.player_name?.trim() || "—",
            ownGoal,
          };
        })
        .sort((a, b) => a.minute - b.minute);
    } catch {
      // Голы — дополнение: без них счёт и минута всё равно полезны.
    }
  }

  return {
    kffGameId,
    phase,
    clockLabel: phase === "live" ? clockLabel(game) : null,
    homeScore: game.home_team.score,
    awayScore: game.away_team.score,
    homePenaltyScore: game.home_penalty_score ?? null,
    awayPenaltyScore: game.away_penalty_score ?? null,
    goals,
  };
}
