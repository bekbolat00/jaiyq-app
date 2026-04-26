import { TEAM_ZHAIYQ } from "@/lib/constants/zhaiyq";
import type { DbMatchRow, ExpertMatchContext, Match, Team } from "@/lib/types";

function opponentTeam(row: DbMatchRow): Team {
  const url = row.logo_url?.trim() ?? "";
  return {
    id: `opponent-${row.id}`,
    shortName: row.opponent,
    fullName: row.opponent,
    logoUrl: url,
  };
}

/** Для InviteFriendSheet и других мест, где нужен `Match`. */
export function dbMatchRowToMatch(row: DbMatchRow): Match {
  const opp = opponentTeam(row);
  const finished =
    row.status === "finished" &&
    row.zhaiyq_score != null &&
    row.opponent_score != null;
  const finalScore =
    finished && row.zhaiyq_score != null && row.opponent_score != null
      ? row.is_home
        ? { home: row.zhaiyq_score, away: row.opponent_score }
        : { home: row.opponent_score, away: row.zhaiyq_score }
      : undefined;

  return {
    id: row.id,
    home: row.is_home ? TEAM_ZHAIYQ : opp,
    away: row.is_home ? opp : TEAM_ZHAIYQ,
    kickoffAt: row.match_date,
    venue: "",
    competition: row.competition,
    ticketUrl: row.ticket_url?.trim() || undefined,
    finalScore,
  };
}

export function dbMatchRowToExpertContext(row: DbMatchRow): ExpertMatchContext {
  return {
    matchId: row.id,
    isHome: row.is_home,
    opponentName: row.opponent,
    opponentLogoUrl: row.logo_url,
    kickoffAt: row.match_date,
  };
}
