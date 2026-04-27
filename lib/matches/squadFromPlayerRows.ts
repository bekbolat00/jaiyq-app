import {
  type LineBlock,
  type LinePlayerRow,
  formatDbPlayerName,
  lineBlockFromLineupRows,
} from "@/lib/matches/matchDetailFromDb";
import type { DbMatchLineupRow, DbPlayerRow } from "@/lib/types";

const COACH_POSITIONS = new Set([
  "Главный тренер",
  "Помощник тренера",
]);

function isCoachByPosition(pos: string): boolean {
  return COACH_POSITIONS.has(pos.trim());
}

export function isFieldLineRole(
  pos: string,
): "вр" | "зщ" | "пз" | "нп" | "oth" {
  const s = pos.toLowerCase();
  if (/вр|вратар|goal|gk|gк|вратарь/i.test(s)) return "вр";
  if (/зщ|защит|def|цз|зщит|cb|fb/i.test(s)) return "зщ";
  if (/пз|полузащ|mid|цп|полу|cdm|cm/i.test(s)) return "пз";
  if (/нап|напад|for|ata|ст|нп|st|cf|fw/i.test(s)) return "нп";
  return "oth";
}

function sortFieldPlayers(players: DbPlayerRow[]): DbPlayerRow[] {
  return [...players].sort((a, b) => {
    const la = isFieldLineRole(a.position);
    const lb = isFieldLineRole(b.position);
    const w = (x: string) =>
      ({ вр: 0, зщ: 1, пз: 2, нп: 3, oth: 2 }[x] ?? 2);
    if (w(la) !== w(lb)) return w(la) - w(lb);
    const na = a.number ?? a.jersey_number ?? 999;
    const nb = b.number ?? b.jersey_number ?? 999;
    return na - nb;
  });
}

function coachRowsFromPosition(players: DbPlayerRow[]): LinePlayerRow[] {
  return sortFieldPlayers(players.filter((p) => isCoachByPosition(p.position))).map(
    (p) => ({
      id: `coach-${p.id}`,
      num:
        p.number == null && p.jersey_number == null
          ? "—"
          : String(p.number ?? p.jersey_number),
      name: formatDbPlayerName(p, "—"),
      pos: "ТР",
    }),
  );
}

function toLinePlayerFromDb(
  p: DbPlayerRow,
  lineupById: Map<string, DbMatchLineupRow>,
): LinePlayerRow {
  const lu = lineupById.get(p.id);
  const raw = lu?.shirt_number ?? p.number ?? p.jersey_number;
  const num = raw == null || Number.isNaN(Number(raw)) ? "—" : String(raw);
  return {
    id: lu?.id ?? `pl-${p.id}`,
    num,
    name: formatDbPlayerName(p, "Игрок"),
    pos: (lu?.position_override || p.position || "—").toUpperCase(),
  };
}

/**
 * Состав по таблице `players`, без валидной заявки: тренеры по `position`, полевые — первые 11 или `is_starter`.
 */
function lineBlockFromPlayerTableOnly(
  teamPlayers: DbPlayerRow[],
  lineupById: Map<string, DbMatchLineupRow>,
): LineBlock {
  const coaches = coachRowsFromPosition(teamPlayers);
  const field = teamPlayers.filter((p) => !isCoachByPosition(p.position));
  const startersByFlag = field.filter((p) => p.is_starter === true);
  let starters: LinePlayerRow[];
  let bench: LinePlayerRow[];
  if (startersByFlag.length > 0) {
    const set = new Set(startersByFlag.map((p) => p.id));
    starters = sortFieldPlayers(field.filter((p) => set.has(p.id))).map(
      (p) => toLinePlayerFromDb(p, lineupById),
    );
    bench = sortFieldPlayers(field.filter((p) => !set.has(p.id))).map((p) =>
      toLinePlayerFromDb(p, lineupById),
    );
  } else {
    const s = sortFieldPlayers(field);
    starters = s.slice(0, 11).map((p) => toLinePlayerFromDb(p, lineupById));
    bench = s.slice(11).map((p) => toLinePlayerFromDb(p, lineupById));
  }
  return { starters, bench, coaches };
}

/**
 * `players` — ответ `.in('team_id', [homeId, awayId])`.
 * `lineupRows` — `match_lineups` матча (роли `starter`/`bench` / `is_substitute` — если есть).
 */
export function lineBlocksFromPlayerRows(
  homeId: string,
  awayId: string,
  players: DbPlayerRow[],
  lineupRows: (DbMatchLineupRow & { player?: DbPlayerRow | null })[] | null,
): { home: LineBlock; away: LineBlock } {
  const hPlayers = players.filter((p) => p.team_id === homeId);
  const aPlayers = players.filter((p) => p.team_id === awayId);
  const hLineup = (lineupRows ?? []).filter((l) => l.team_id === homeId);
  const aLineup = (lineupRows ?? []).filter((l) => l.team_id === awayId);
  const hById = new Map(
    hLineup.map((l) => [l.player_id, l] as [string, DbMatchLineupRow]),
  );
  const aById = new Map(
    aLineup.map((l) => [l.player_id, l] as [string, DbMatchLineupRow]),
  );

  return {
    home: teamLineBlock(hPlayers, hLineup, hById),
    away: teamLineBlock(aPlayers, aLineup, aById),
  };
}

function teamLineBlock(
  teamPlayers: DbPlayerRow[],
  teamLineup: (DbMatchLineupRow & { player?: DbPlayerRow | null })[],
  lineupById: Map<string, DbMatchLineupRow>,
): LineBlock {
  if (teamLineup.length) {
    const fromLu = lineBlockFromLineupRows(
      teamLineup as (DbMatchLineupRow & { player: DbPlayerRow | null })[],
    );
    const fromPos = coachRowsFromPosition(teamPlayers);
    const hasRoster = fromLu.starters.length + fromLu.bench.length > 0;
    if (hasRoster) {
      return { ...fromLu, coaches: fromPos.length ? fromPos : fromLu.coaches };
    }
  }
  return lineBlockFromPlayerTableOnly(teamPlayers, lineupById);
}
