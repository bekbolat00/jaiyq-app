import { createHash, randomInt } from "node:crypto";
import { fanDisplayName } from "@/lib/fans/scoring";
import { freeKickSpotFromSeed, simulateShot, type GameMode, type KickSpot, type ShotInput, type ShotOutcome } from "@/lib/game/penalty";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const ATTEMPTS_PER_DAY = 3;

/** Дата «игрового дня» по времени Уральска (UTC+5). */
export function playDate(now = new Date()): string {
  return new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Криптостойкая случайность: исход нельзя предсказать по коду клиента. */
const secureRandom = () => randomInt(0, 2 ** 32) / 2 ** 32;

type ShotRow = { attempt: number; result: ShotOutcome["result"]; points: number; coins: number; top_corner: boolean };

/** Точка штрафного для конкретной попытки — одинаковая при показе и при ударе. */
export function freeKickSpotFor(telegramId: number, date: string, attempt: number): KickSpot {
  const digest = createHash("sha256").update(`${telegramId}:${date}:${attempt}:freekick`).digest();
  return freeKickSpotFromSeed(digest.readUInt32BE(0));
}

export type PenaltyStatus = {
  attemptsLeft: number;
  /** Где будет стоять мяч, если следующая попытка — штрафной. */
  nextFreeKick: KickSpot | null;
  today: { attempt: number; result: ShotOutcome["result"]; points: number; topCorner: boolean }[];
  totalPoints: number;
  totalGoals: number;
};

export class MissingTableError extends Error {}

function isMissingTable(err: { code?: string } | null) {
  // Нет таблицы или колонки `mode` (миграция штрафного не применена).
  return ["42P01", "PGRST205", "42703", "PGRST204"].includes(err?.code ?? "");
}

export async function getPenaltyStatus(telegramId: number): Promise<PenaltyStatus> {
  const admin = getSupabaseAdminClient();
  const [today, totals] = await Promise.all([
    admin
      .from("penalty_shots")
      .select("attempt, result, points, coins, top_corner")
      .eq("telegram_id", telegramId)
      .eq("play_date", playDate())
      .order("attempt"),
    admin.from("penalty_shots").select("points, result").eq("telegram_id", telegramId),
  ]);
  if (isMissingTable(today.error) || isMissingTable(totals.error)) throw new MissingTableError("penalty_shots");
  if (today.error) throw new Error(today.error.message);
  if (totals.error) throw new Error(totals.error.message);

  const rows = (today.data ?? []) as ShotRow[];
  const attemptsLeft = Math.max(0, ATTEMPTS_PER_DAY - rows.length);
  return {
    attemptsLeft,
    nextFreeKick: attemptsLeft > 0 ? freeKickSpotFor(telegramId, playDate(), rows.length + 1) : null,
    today: rows.map((r) => ({ attempt: r.attempt, result: r.result, points: r.points, topCorner: r.top_corner })),
    totalPoints: (totals.data ?? []).reduce((s, r) => s + (r.points ?? 0), 0),
    totalGoals: (totals.data ?? []).filter((r) => r.result === "goal").length,
  };
}

export type ShootResponse =
  | { ok: true; outcome: ShotOutcome; attemptsLeft: number; coins: number | null; totalPoints: number }
  | { ok: false; reason: "no-attempts" | "busy" };

/** Начислить монеты без гонки: условное обновление по старому балансу, до 3 попыток. */
async function creditCoins(telegramId: number, amount: number): Promise<number | null> {
  const admin = getSupabaseAdminClient();
  for (let i = 0; i < 3; i++) {
    const { data: row } = await admin.from("users").select("coins").eq("telegram_id", telegramId).maybeSingle();
    if (!row) return null;
    const current = row.coins ?? 0;
    let q = admin.from("users").update({ coins: current + amount }).eq("telegram_id", telegramId);
    q = row.coins == null ? q.is("coins", null) : q.eq("coins", current);
    const { data } = await q.select("coins").maybeSingle();
    if (data) return data.coins as number;
  }
  return null;
}

export async function takeShot(telegramId: number, input: ShotInput, mode: GameMode = "penalty"): Promise<ShootResponse> {
  const admin = getSupabaseAdminClient();
  const status = await getPenaltyStatus(telegramId);
  if (status.attemptsLeft <= 0) return { ok: false, reason: "no-attempts" };

  const attempt = ATTEMPTS_PER_DAY - status.attemptsLeft + 1;
  const spot = mode === "freekick" ? freeKickSpotFor(telegramId, playDate(), attempt) : undefined;
  const outcome = simulateShot(input, secureRandom, mode, spot);

  const { error } = await admin.from("penalty_shots").insert({
    telegram_id: telegramId,
    play_date: playDate(),
    attempt,
    mode,
    aim_x: input.aimX,
    aim_y: input.aimY,
    power: input.power,
    curve: input.curve,
    result: outcome.result,
    top_corner: outcome.topCorner,
    points: outcome.points,
    coins: outcome.coins,
  });
  if (error) {
    // 23505 — эта попытка уже записана параллельным запросом (двойной свайп).
    if (error.code === "23505") return { ok: false, reason: "busy" };
    if (isMissingTable(error)) throw new MissingTableError("penalty_shots");
    throw new Error(error.message);
  }

  const coins = outcome.coins > 0 ? await creditCoins(telegramId, outcome.coins) : null;
  return {
    ok: true,
    outcome,
    attemptsLeft: status.attemptsLeft - 1,
    coins,
    totalPoints: status.totalPoints + outcome.points,
  };
}

export type ScorerRow = { place: number; name: string; photoUrl: string | null; points: number; goals: number; isMe: boolean };

let boardCache: { at: number; rows: (Omit<ScorerRow, "isMe"> & { telegramId: number })[] } | null = null;

/** Рейтинг «Бомбардиры»: сумма очков за все удары (гол — 1, девятка — 2). Кэш 60 с. */
export async function scorersLeaderboard(meTelegramId: number | null) {
  if (!boardCache || Date.now() - boardCache.at > 60_000) {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin.from("penalty_shots").select("telegram_id, points, result");
    if (isMissingTable(error)) throw new MissingTableError("penalty_shots");
    if (error) throw new Error(error.message);

    const totals = new Map<number, { points: number; goals: number }>();
    for (const r of data ?? []) {
      const id = Number(r.telegram_id);
      const t = totals.get(id) ?? { points: 0, goals: 0 };
      t.points += r.points ?? 0;
      if (r.result === "goal") t.goals += 1;
      totals.set(id, t);
    }
    const ids = [...totals.keys()].filter((id) => (totals.get(id)?.points ?? 0) > 0);
    const users = ids.length
      ? ((await admin.from("users").select("telegram_id, first_name, last_name, username, photo_url").in("telegram_id", ids)).data ?? [])
      : [];
    const byId = new Map(users.map((u) => [Number(u.telegram_id), u]));

    const sorted = ids
      .map((id) => ({ telegramId: id, ...totals.get(id)! }))
      .sort((a, b) => b.points - a.points || b.goals - a.goals || a.telegramId - b.telegramId);
    const rows: (Omit<ScorerRow, "isMe"> & { telegramId: number })[] = [];
    sorted.forEach((s, i) => {
      const prev = rows[i - 1];
      const place = prev && prev.points === s.points && prev.goals === s.goals ? prev.place : i + 1;
      const u = byId.get(s.telegramId);
      rows.push({
        telegramId: s.telegramId,
        place,
        name: u ? fanDisplayName(u) : "Болельщик",
        photoUrl: u?.photo_url?.trim() || null,
        points: s.points,
        goals: s.goals,
      });
    });
    boardCache = { at: Date.now(), rows };
  }

  const strip = ({ telegramId, ...row }: Omit<ScorerRow, "isMe"> & { telegramId: number }): ScorerRow => ({
    ...row,
    isMe: telegramId === meTelegramId,
  });
  const me = meTelegramId != null ? boardCache.rows.find((r) => r.telegramId === meTelegramId) : undefined;
  return { top: boardCache.rows.slice(0, 20).map(strip), me: me ? strip(me) : null, total: boardCache.rows.length };
}
