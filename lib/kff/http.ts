/** Общий HTTP-доступ к публичному API kffleague.kz (только сервер). */

const API_BASE = "https://kffleague.kz/api/v1";
const USER_AGENT =
  "Mozilla/5.0 (compatible; ZhaiyqAppMatchScraper/1.0; +https://kffleague.kz/ru/matches)";

export const ZHAIYQ_KFF_TEAM_ID = 633;

export async function kffJson<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}${path.includes("?") ? "&" : "?"}lang=ru`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`KFF ${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Текущий сезон лиги для команды (id «сезона» KFF, например 204). */
export async function currentSeasonId(teamId = ZHAIYQ_KFF_TEAM_ID): Promise<number> {
  const d = await kffJson<{ season_id: number }>(`/teams/${teamId}/seasons/default`);
  return d.season_id;
}

/**
 * Небольшой кэш в памяти функции: KFF не стоит дёргать на каждое открытие
 * карточки, а ответы (ростер, таблица) меняются раз в несколько часов.
 */
const memo = new Map<string, { at: number; value: unknown }>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await load();
  memo.set(key, { at: Date.now(), value });
  return value;
}
