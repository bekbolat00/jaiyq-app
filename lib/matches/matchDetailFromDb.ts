import type { LiveMatchStatsShape, LiveTimelineEvent } from "@/lib/data/mock";
import { LIVE_MATCH_STATS_ARYS_ZHAIYQ_FALLBACK } from "@/lib/data/mock";
import { dbMatchRowToMatch } from "@/lib/matches/mapDbMatch";
import type {
  DbMatchEventRow,
  DbMatchLineupRow,
  DbMatchStatRow,
  DbPlayerRow,
  DbTeamRow,
  DbMatchWithRelations,
  Match,
  Team,
} from "@/lib/types";

export function formatDbPlayerName(
  p: DbPlayerRow | null | undefined,
  fallback = "",
): string {
  if (!p) return fallback;
  const single = p.name?.trim();
  const fn = p.first_name?.trim() ?? "";
  const ln = p.last_name?.trim() ?? "";
  if (single && !fn && !ln) return single;
  if (!fn && !ln) return fallback;
  if (ln && fn) return `${fn[0]}. ${ln}`;
  return fn || ln;
}

/** Фамилия из подписи «И. Иванов» или «Иванов И.» (последний токен не должен быть инициалом). */
export function surnameFromDisplayLabel(displayName: string): string {
  const t = displayName.trim();
  if (!t) return "";
  const m = t.match(/^[А-ЯA-ZЁІ]\.\s*(.+)$/);
  if (m?.[1]) return m[1]!.trim();
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1] ?? "";
    if (/^[А-ЯA-ZЁІ]\.?$/.test(last)) return parts[0]!;
    return last;
  }
  return t;
}

/** Фамилия для схемы: `display_name` / `last_name` / разбор `name` и склейки first+last. */
export function playerSurnameForPitch(
  p: DbPlayerRow | null | undefined,
): string {
  if (!p) return "";
  const display = (p.display_name ?? "").trim();
  if (display) return display;
  const ln = (p.last_name ?? "").trim();
  const fn = (p.first_name ?? "").trim();
  const single = (p.name ?? "").trim();
  if (ln.length >= 2) return ln;
  if (single && !fn && !ln) return surnameFromDisplayLabel(single);
  const composed = formatDbPlayerName(p, "");
  const fromComposed = surnameFromDisplayLabel(composed);
  if (fromComposed.length >= 2) return fromComposed;
  if (single) return surnameFromDisplayLabel(single);
  return ln || fn || composed;
}

function playerLabel(p: DbPlayerRow | null | undefined, fallback = ""): string {
  return formatDbPlayerName(p, fallback);
}

function isZhaiyqTeamName(row: Pick<DbTeamRow, "short_name" | "slug" | "full_name">) {
  const a = (row.short_name + row.full_name + (row.slug ?? "")).toLowerCase();
  return a.includes("жай") || a.includes("zhaiyq");
}

/** Определяет UUID хозяев/гостей в строках статов и заявок. */
export function resolveHomeAwayTeamIds(
  matchRow: DbMatchWithRelations,
  teams: DbTeamRow[],
): { homeId: string; awayId: string } | null {
  const ht = matchRow.home_team_id?.trim();
  const at = matchRow.away_team_id?.trim();
  if (ht && at) return { homeId: ht, awayId: at };

  if (teams.length < 1) return null;
  const z = teams.find(isZhaiyqTeamName) ?? null;
  if (teams.length < 2 && teams.length > 0) {
    return null;
  }
  const oth = teams.find((t) => t.id !== z?.id) ?? null;
  if (z && oth) {
    if (matchRow.is_home) return { homeId: z.id, awayId: oth.id };
    return { homeId: oth.id, awayId: z.id };
  }
  if (teams.length === 2) {
    if (matchRow.is_home) {
      return { homeId: teams[0]!.id, awayId: teams[1]!.id };
    }
    return { homeId: teams[1]!.id, awayId: teams[0]!.id };
  }
  return null;
}

function twoTeamStats(
  homeId: string,
  awayId: string,
  rows: DbMatchStatRow[] | null | undefined,
): { home: DbMatchStatRow; away: DbMatchStatRow } | null {
  if (!rows?.length) return null;
  const a = rows.find((r) => r.is_home === true);
  const b = rows.find((r) => r.is_home === false);
  if (a && b) return { home: a, away: b };
  const h = rows.find((r) => r.team_id === homeId);
  const w = rows.find((r) => r.team_id === awayId);
  if (h && w) return { home: h, away: w };
  if (rows.length === 2) return { home: rows[0]!, away: rows[1]! };
  if (rows.length === 1) return { home: rows[0]!, away: rows[0]! };
  return null;
}

function eventTypeToTimeline(
  ev: DbMatchEventRow,
): "goal" | "yellow" | "sub" {
  const raw = (ev.event_type ?? ev.type ?? "").toString().toLowerCase();
  if (raw.includes("sub") || raw.includes("замен") || raw === "substitution") {
    return "sub";
  }
  if (
    raw.includes("goal") ||
    raw.includes("гол") ||
    raw === "gol" ||
    raw === "goal"
  ) {
    return "goal";
  }
  if (
    raw.includes("red") ||
    raw.includes("красн") ||
    raw.includes("red_card")
  ) {
    return "yellow";
  }
  if (
    raw.includes("yellow") ||
    raw.includes("жк") ||
    raw.includes("карт") ||
    raw.includes("yellow_card")
  ) {
    return "yellow";
  }
  return "sub";
}

function eventText(ev: DbMatchEventRow): string {
  if (ev.description?.trim()) return ev.description.trim();
  if (ev.details?.trim()) return ev.details.trim();
  if (ev.player) {
    const t = eventTypeToTimeline(ev);
    if (t === "goal")
      return `Гол — ${playerLabel(ev.player, "")}`.trim() || "Гол";
  }
  return "Событие";
}

export type LinePlayerRow = {
  num: string;
  name: string;
  /** Фамилия для поля и списков (из полей БД / без путаницы «Фамилия И.»). */
  surname: string;
  pos: string;
  id: string;
};

export type LineBlock = {
  starters: LinePlayerRow[];
  bench: LinePlayerRow[];
  coaches: LinePlayerRow[];
};

function sortLineupRows(
  a: (DbMatchLineupRow & { player: DbPlayerRow | null })[],
): (DbMatchLineupRow & { player: DbPlayerRow | null })[] {
  return [...a].sort((u, v) => {
    const s = (u.sort_order ?? 0) - (v.sort_order ?? 0);
    if (s !== 0) return s;
    return (u.player?.last_name ?? "").localeCompare(
      v.player?.last_name ?? "",
      "ru",
    );
  });
}

function lineFromRow(
  r: DbMatchLineupRow & { player: DbPlayerRow | null },
): LinePlayerRow {
  const p = r.player;
  const raw = r.shirt_number ?? p?.number ?? p?.jersey_number;
  const num = raw == null || Number.isNaN(Number(raw)) ? "—" : String(raw);
  const name = p ? playerLabel(p, "Игрок") : "—";
  return {
    num,
    name,
    surname: p ? playerSurnameForPitch(p) : surnameFromDisplayLabel(name),
    pos: (r.position_override || p?.position || "—").toUpperCase(),
    id: r.id,
  };
}

function toLineBlock(
  rows: (DbMatchLineupRow & { player: DbPlayerRow | null })[],
  _teamName: string,
): LineBlock {
  const coachRows = rows.filter(
    (r) =>
      r.is_coach === true ||
      (r.role && String(r.role).toLowerCase() === "coach"),
  );
  const other = rows.filter(
    (r) =>
      r.is_coach !== true && String(r.role ?? "").toLowerCase() !== "coach",
  );
  const bench = other.filter(
    (r) =>
      r.is_substitute === true ||
      String(r.role ?? "").toLowerCase() === "bench",
  );
  const startersCands = other.filter(
    (r) =>
      r.is_substitute !== true &&
      String(r.role ?? "").toLowerCase() !== "bench",
  );
  const hasBench = bench.length > 0;
  const sortedCands = sortLineupRows(startersCands);
  const starterLines: LinePlayerRow[] = hasBench
    ? sortedCands.map(lineFromRow)
    : sortedCands
        .slice(0, 11)
        .map(lineFromRow);
  const benchFromPlain = hasBench
    ? bench
    : sortLineupRows(startersCands)
        .slice(11);
  return {
    starters: starterLines.length
      ? starterLines
      : sortLineupRows(other).map(lineFromRow).slice(0, 11),
    bench: sortLineupRows(benchFromPlain).map(lineFromRow),
    coaches: sortLineupRows(coachRows).map((r) => {
      const base = lineFromRow(r);
      return { ...base, pos: "ТР" };
    }),
  };
}

/** Заявка `match_lineups` для одной команды (только с проигрывателем-join при необходимости). */
export function lineBlockFromLineupRows(
  rows: (DbMatchLineupRow & { player: DbPlayerRow | null })[],
): LineBlock {
  return toLineBlock(rows, "");
}

export type MatchDetailViewModel = {
  base: Match;
  home: Team;
  away: Team;
  homeScore: number;
  awayScore: number;
  competition: string;
  statusLabel: string;
  homeId: string | null;
  awayId: string | null;
  timeline: LiveTimelineEvent[];
  /** Надписи под счётом: кратко, по голам. */
  homeScorers: string;
  awayScorers: string;
  stats: LiveMatchStatsShape;
  homeSquad: LineBlock;
  awaySquad: LineBlock;
};

function sideFromTeamId(
  id: string,
  homeId: string | null,
  awayId: string | null,
): "home" | "away" {
  if (id === homeId) return "home";
  if (id === awayId) return "away";
  return "home";
}

/**
 * Статистика для матч-центра: владение в %; счётчики — из `match_stats` при наличии полей.
 */
function buildStats(h: DbMatchStatRow, w: DbMatchStatRow): LiveMatchStatsShape {
  const ph = h.possession ?? h.possession_pct ?? 0;
  const pa = w.possession ?? w.possession_pct ?? 0;
  const hasTotalH = h.shots != null || h.total_shots != null;
  const hasTotalA = w.shots != null || w.total_shots != null;
  const shotsH = hasTotalH
    ? (h.shots ?? h.total_shots ?? 0)
    : (h.shots ?? h.total_shots ?? h.shots_on_target ?? 0);
  const shotsA = hasTotalA
    ? (w.shots ?? w.total_shots ?? 0)
    : (w.shots ?? w.total_shots ?? w.shots_on_target ?? 0);
  const sotH = hasTotalH ? (h.shots_on_target ?? 0) : 0;
  const sotA = hasTotalA ? (w.shots_on_target ?? 0) : 0;
  const ch = h.corners ?? 0;
  const ca = w.corners ?? 0;
  const oh = h.offsides ?? 0;
  const oa = w.offsides ?? 0;
  const savH = h.saves ?? 0;
  const savA = w.saves ?? 0;
  const yh = h.yellow_cards ?? 0;
  const ya = w.yellow_cards ?? 0;
  return {
    possession: { home: ph, away: pa },
    shots: { home: shotsH, away: shotsA },
    shotsOnTarget: { home: sotH, away: sotA },
    corners: { home: ch, away: ca },
    offsides: { home: oh, away: oa },
    saves: { home: savH, away: savA },
    yellowCards: { home: yh, away: ya },
  };
}

export function buildMatchDetailViewModel(
  m: DbMatchWithRelations,
  teams: DbTeamRow[],
): MatchDetailViewModel {
  const base = dbMatchRowToMatch(m);
  const { home, away, competition } = base;
  const sc =
    base.finalScore ??
    (m.zhaiyq_score != null && m.opponent_score != null
      ? m.is_home
        ? { home: m.zhaiyq_score, away: m.opponent_score }
        : { home: m.opponent_score, away: m.zhaiyq_score }
      : { home: 0, away: 0 });
  const homeScore = sc.home;
  const awayScore = sc.away;

  const pair = resolveHomeAwayTeamIds(m, teams);
  const homeId = pair?.homeId ?? null;
  const awayId = pair?.awayId ?? null;
  const lineups = (m.match_lineups ?? [])
    .filter(
      (r): r is DbMatchLineupRow & { player: DbPlayerRow } =>
        Boolean(r && r.player),
    )
    .map((r) => ({ ...r, player: r.player! }));

  let hRows: typeof lineups;
  let aRows: typeof lineups;
  if (homeId && awayId) {
    hRows = lineups.filter((r) => r.team_id === homeId);
    aRows = lineups.filter((r) => r.team_id === awayId);
  } else {
    const tids = [...new Set(lineups.map((l) => l.team_id))];
    if (tids.length === 0) {
      hRows = [];
      aRows = [];
    } else if (tids.length === 1) {
      hRows = lineups;
      aRows = [];
    } else {
      hRows = lineups.filter((r) => r.team_id === tids[0]);
      aRows = lineups.filter((r) => r.team_id === tids[1]);
    }
  }
  const homeSquad = toLineBlock(hRows, home.shortName);
  const awaySquad = toLineBlock(aRows, away.shortName);

  let st = twoTeamStats(
    homeId != null && awayId != null ? homeId : "",
    homeId != null && awayId != null ? awayId : "",
    m.match_stats,
  );
  if (!st && m.match_stats && m.match_stats.length >= 2) {
    st = { home: m.match_stats[0]!, away: m.match_stats[1]! };
  }
  const stats = st
    ? buildStats(st.home, st.away)
    : LIVE_MATCH_STATS_ARYS_ZHAIYQ_FALLBACK;

  const evs = [...(m.match_events ?? [])].sort((a, b) => a.minute - b.minute);
  const timeline: LiveTimelineEvent[] = evs.map((ev) => {
    const side = sideFromTeamId(
      ev.team_id,
      homeId,
      awayId,
    );
    return {
      id: ev.id,
      minute: ev.minute,
      type: eventTypeToTimeline(ev),
      label: eventText(ev),
      side,
    };
  });

  const goals = evs.filter((e) => eventTypeToTimeline(e) === "goal");
  const homeG = goals.filter((g) => g.team_id === homeId);
  const awayG = goals.filter((g) => g.team_id === awayId);
  const fmt = (g: DbMatchEventRow) => {
    const t = g.description?.trim() || g.details;
    if (t) {
      if (/\d+\s*['′`]?\s*$/i.test(t)) return t;
      return `${t} ${g.minute}'`;
    }
    if (g.player) return `${playerLabel(g.player, "")} ${g.minute}'`.trim();
    return `${g.minute}'`;
  };
  return {
    base,
    home,
    away,
    homeScore,
    awayScore,
    competition,
    statusLabel: m.status === "finished" ? "ЗАВЕРШЁН" : "СЕГОДНЯ",
    homeId,
    awayId,
    timeline,
    homeScorers: homeG.length ? homeG.map(fmt).join(" · ") : "—",
    awayScorers: awayG.length ? awayG.map(fmt).join(" · ") : "—",
    stats,
    homeSquad,
    awaySquad,
  };
}
