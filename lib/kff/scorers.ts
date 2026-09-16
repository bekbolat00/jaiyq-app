import { cached, currentSeasonId, kffJson, ZHAIYQ_KFF_TEAM_ID } from "@/lib/kff/http";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Кандидаты «кто забьёт первым» для шага прогноза: не весь состав, а те,
 * кто реально бьёт по воротам — нападающие, вингеры, атакующие полузащитники
 * и все, кто уже забивал в сезоне. Роли берутся из KFF (позиции по заявкам),
 * а id и фото — из нашей базы, потому что прогноз хранит id игрока из `players`.
 */

type KffRosterItem = {
  id: number;
  first_name: string;
  last_name: string;
  number: number | null;
  position: string | null;
  photo_url: string | null;
  photo_url_leaderboard: string | null;
};

type KffPlayerDetail = {
  top_role: string | null;
  positions?: { primary?: string | null; secondary?: string[] | null } | null;
};

type KffSeasonStats = { goal: number; games_played: number } | null;

type DbPlayer = { id: string; name: string; number: number | null; photo_url: string | null; goals: number | null };

export type ScorerCandidate = {
  /** id игрока в `public.players` (или `kff:<id>`, если в базе его нет). */
  id: string;
  firstName: string;
  surname: string;
  number: string;
  photoUrl: string | null;
  role: "Нападающий" | "Вингер" | "Атакующий полузащитник" | "Полузащитник" | "Защитник";
  goals: number;
  games: number;
};

const FORWARD = new Set(["ЦН", "Н", "ЛН", "ПН"]);
const WINGER = new Set(["ЛП", "ПП"]);
const ATTACKING_MID = new Set(["ЛАП", "ПАП", "АП"]);

const LETTER_FOLD: Record<string, string> = {
  ё: "е", ұ: "у", ү: "у", ә: "а", і: "и", ғ: "г", қ: "к", ң: "н", ө: "о", һ: "х",
};

function nameKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ёұүәігқңөһ]/g, (c) => LETTER_FOLD[c] ?? c)
    .replace(/[^a-zа-я0-9]+/g, "");
}

/** «ЦН (центральный нападающий)» → «ЦН». */
function roleCode(topRole: string | null): string | null {
  return topRole?.match(/^([А-ЯЁ]{1,4})\b/)?.[1] ?? null;
}

function classify(p: KffRosterItem, d: KffPlayerDetail): ScorerCandidate["role"] | null {
  const codes = [d.positions?.primary, ...(d.positions?.secondary ?? []), roleCode(d.top_role)].filter(
    (c): c is string => Boolean(c),
  );
  const primary = d.positions?.primary ?? roleCode(d.top_role);
  if ((primary && FORWARD.has(primary)) || (!primary && p.position === "FWD")) return "Нападающий";
  if (primary && WINGER.has(primary)) return "Вингер";
  if (primary && ATTACKING_MID.has(primary)) return "Атакующий полузащитник";
  // Опорник или защитник, который по заявкам играет и в атаке.
  if (codes.some((c) => FORWARD.has(c) || WINGER.has(c) || ATTACKING_MID.has(c))) return "Атакующий полузащитник";
  return null;
}

const ROLE_ORDER: Record<ScorerCandidate["role"], number> = {
  Нападающий: 0,
  Вингер: 1,
  "Атакующий полузащитник": 2,
  Полузащитник: 3,
  Защитник: 4,
};

async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

/** Кэш на 6 часов: состав и роли меняются редко, а KFF не стоит дёргать на каждое открытие. */
export function fetchScorerCandidates(): Promise<ScorerCandidate[]> {
  return cached("scorers", 6 * 60 * 60_000, async () => {
    const seasonId = await currentSeasonId();
    const [{ items }, dbPlayers] = await Promise.all([
      kffJson<{ items: KffRosterItem[] }>(`/teams/${ZHAIYQ_KFF_TEAM_ID}/players?season_id=${seasonId}`),
      loadDbPlayers(),
    ]);
    const outfield = (items ?? []).filter((p) => p.position !== "GK");

    const enriched = await inBatches(outfield, 5, async (p) => {
      const [detail, stats] = await Promise.all([
        kffJson<KffPlayerDetail>(`/players/${p.id}`).catch(() => ({ top_role: null }) as KffPlayerDetail),
        kffJson<KffSeasonStats>(`/players/${p.id}/stats?season_id=${seasonId}`).catch(() => null),
      ]);
      return { p, detail, goals: stats?.goal ?? 0, games: stats?.games_played ?? 0 };
    });

    const candidates: ScorerCandidate[] = [];
    for (const { p, detail, goals, games } of enriched) {
      let role = classify(p, detail);
      // Забивал в этом сезоне — значит, кандидат, даже если числится в обороне.
      if (!role && goals > 0) role = p.position === "DEF" ? "Защитник" : "Полузащитник";
      if (!role) continue;

      const key = nameKey(p.last_name);
      const db =
        dbPlayers.find((r) => Number(r.number) === Number(p.number) && nameKey(r.name).includes(key)) ??
        dbPlayers.find((r) => key && nameKey(r.name.split(/\s+/)[0] ?? "") === key) ??
        null;

      candidates.push({
        id: db?.id ?? `kff:${p.id}`,
        firstName: p.first_name,
        surname: p.last_name,
        number: p.number != null ? String(p.number) : "—",
        photoUrl: db?.photo_url || p.photo_url_leaderboard || null,
        role,
        goals,
        games,
      });
    }

    // Первыми — те, кто уже забивает; при равенстве нападающие раньше полузащитников.
    return candidates.sort(
      (a, b) => b.goals - a.goals || ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || b.games - a.games,
    );
  });
}

async function loadDbPlayers(): Promise<DbPlayer[]> {
  const admin = getSupabaseAdminClient();
  const { data: teams } = await admin.from("teams").select("id, name");
  const zhaiyq = (teams ?? []).find((t) => /жай|zhaiyq/i.test(String(t.name ?? "")));
  if (!zhaiyq) return [];
  const { data } = await admin.from("players").select("id, name, number, photo_url, goals").eq("team_id", zhaiyq.id);
  return (data ?? []) as DbPlayer[];
}
