import {
  type LineBlock,
  type LinePlayerRow,
  formatDbPlayerName,
  lineBlockFromLineupRows,
  playerStatsFields,
  splitDbPlayerName,
  surnameFromDisplayLabel,
} from "@/lib/matches/matchDetailFromDb";
import type { DbMatchLineupRow, DbPlayerRow } from "@/lib/types";

const COACH_POSITIONS = new Set([
  "Главный тренер",
  "Помощник тренера",
]);

function isCoachByPosition(pos: string): boolean {
  const t = pos.trim();
  if (COACH_POSITIONS.has(t)) return true;
  // Как в SQL: position ILIKE '%тренер%'
  return /тренер/i.test(t);
}

export function isFieldLineRole(
  pos: string,
): "вр" | "зщ" | "пз" | "нп" | "oth" {
  const s = pos.toLowerCase();
  if (/вр|вратар|goal|gk|gк|вратарь/i.test(s)) return "вр";
  // «Полузащитник» содержит подстроку «защит» — сначала пз, потом зщ.
  if (/пз|полузащ|mid|цп|полу|cdm|cm/i.test(s)) return "пз";
  if (/зщ|защит|def|цз|зщит|cb|fb/i.test(s)) return "зщ";
  if (/нап|напад|for|ata|ст|нп|st|cf|fw|винг|wing|winger|фланг|lw|rw/i.test(s))
    return "нп";
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
    (p) => {
      const name = formatDbPlayerName(p, "—");
      const { firstName, surname } = splitDbPlayerName(p);
      return {
        id: `coach-${p.id}`,
        num:
          p.number == null && p.jersey_number == null
            ? "—"
            : String(p.number ?? p.jersey_number),
        name,
        firstName,
        surname: surname || surnameFromDisplayLabel(name),
        pos: "ТР",
        photoUrl: p.photo_url?.trim() || null,
        ...playerStatsFields(p),
      };
    },
  );
}

function toLinePlayerFromDb(
  p: DbPlayerRow,
  lineupById: Map<string, DbMatchLineupRow>,
): LinePlayerRow {
  const lu = lineupById.get(p.id);
  const raw = lu?.shirt_number ?? p.number ?? p.jersey_number;
  const num = raw == null || Number.isNaN(Number(raw)) ? "—" : String(raw);
  const name = formatDbPlayerName(p, "Игрок");
  const { firstName, surname } = splitDbPlayerName(p);
  return {
    id: lu?.id ?? `pl-${p.id}`,
    num,
    name,
    firstName,
    surname: surname || surnameFromDisplayLabel(name),
    pos: (lu?.position_override || p.position || "—").toUpperCase(),
    photoUrl: p.photo_url?.trim() || null,
    ...playerStatsFields(p),
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
    // Без реальной заявки на матч (`is_starter`/`match_lineups`) нельзя
    // просто взять первых 11 по (линия, номер) — при неравномерном составе
    // ростера это легко даёт «вратарь + 8 защитников, 0 полузащитников»
    // вместо похожей на футбол схемы. Вместо этого набираем стартовый
    // состав по типовым лимитам на линию (1-4-4-2), а нехватку в какой-то
    // линии (например, нет нападающих в БД) добираем из оставшихся любой
    // линии — так авто-состав хотя бы отдалённо похож на реальную схему.
    const byLine: Record<"вр" | "зщ" | "пз" | "нп", DbPlayerRow[]> = {
      вр: [],
      зщ: [],
      пз: [],
      нп: [],
    };
    for (const p of field) {
      const line = isFieldLineRole(p.position);
      byLine[line === "oth" ? "пз" : line].push(p);
    }
    const order: Array<"вр" | "зщ" | "пз" | "нп"> = ["вр", "зщ", "пз", "нп"];
    for (const key of order) byLine[key] = sortFieldPlayers(byLine[key]);

    const targetCount: Record<"вр" | "зщ" | "пз" | "нп", number> = {
      вр: 1,
      зщ: 4,
      пз: 4,
      нп: 2,
    };
    const picked: DbPlayerRow[] = [];
    for (const key of order) picked.push(...byLine[key].slice(0, targetCount[key]));

    if (picked.length < 11) {
      // Добор нехватки — только полевыми игроками: лишние вратари сверх
      // целевого 1 не нужны команде на поле, даже если в БД их несколько.
      const pickedIds = new Set(picked.map((p) => p.id));
      const rest = order
        .filter((key) => key !== "вр")
        .flatMap((key) => byLine[key])
        .filter((p) => !pickedIds.has(p.id));
      picked.push(...rest.slice(0, 11 - picked.length));
    }

    const pickedIds = new Set(picked.map((p) => p.id));
    starters = sortFieldPlayers(picked).map((p) => toLinePlayerFromDb(p, lineupById));
    bench = sortFieldPlayers(field.filter((p) => !pickedIds.has(p.id))).map((p) =>
      toLinePlayerFromDb(p, lineupById),
    );
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
