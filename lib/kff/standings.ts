import { cached, currentSeasonId, kffJson } from "@/lib/kff/http";

type KffTableRow = {
  position: number;
  team_id: number;
  team_name: string;
  team_logo: string | null;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_scored: number;
  goals_conceded: number;
  goal_difference: number;
  points: number;
  /** Последние матчи, например "WDLWL". */
  form: string | null;
};

export type StandingsRow = {
  place: number;
  kffTeamId: number;
  name: string;
  logoUrl: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  diff: number;
  points: number;
  form: ("W" | "D" | "L")[];
};

export type Standings = { seasonId: number; rows: StandingsRow[] };

/** Живая турнирная таблица Первой лиги с kffleague.kz (кэш 10 минут). */
export function fetchStandings(): Promise<Standings> {
  return cached("standings", 10 * 60_000, async () => {
    const seasonId = await currentSeasonId();
    const d = await kffJson<{ table: KffTableRow[] }>(`/seasons/${seasonId}/table`);
    const rows = d.table.map<StandingsRow>((r) => ({
      place: r.position,
      kffTeamId: r.team_id,
      name: r.team_name,
      logoUrl: r.team_logo,
      played: r.games_played,
      wins: r.wins,
      draws: r.draws,
      losses: r.losses,
      goalsFor: r.goals_scored,
      goalsAgainst: r.goals_conceded,
      diff: r.goal_difference,
      points: r.points,
      form: (r.form ?? "")
        .split("")
        .filter((c): c is "W" | "D" | "L" => c === "W" || c === "D" || c === "L"),
    }));
    return { seasonId, rows };
  });
}
