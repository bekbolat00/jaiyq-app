/**
 * Тренировочный центр «Забей гол»: тренировка точности. Чистые функции без
 * зависимостей — сервер считает по ним удар, очки и опыт, клиент рисует мишень.
 *
 * Физика удара — та же, что у пенальти (`shotPlan` из penalty.ts). Отличия:
 *  - разброс умножается на `accuracySpreadScale(level)` — и только он;
 *  - вратарь пассивный: стоит в воротах и не отбивает;
 *  - очки считаются по мишени, а не по голу.
 *
 * Правила сессии (5 ударов, срок жизни, пауза между ударами, одно начисление
 * опыта, дневной лимит наград) продублированы в SQL-функциях миграции
 * training_center — база их гарантирует, здесь они для тестов и сервера.
 */

import {
  BALL_RADIUS,
  finalHeight,
  gaussian,
  goalFrameResult,
  liftFor,
  missFlightPoint,
  PENALTY_SPOT,
  round,
  shotPlan,
  wobbleFor,
  type Random,
  type ShotInput,
  type ShotOutcome,
} from "@/lib/game/penalty";
import { accuracySpreadScale } from "@/lib/game/skills";

export type TrainingDrill = "accuracy";

/** Ударов в одной тренировке. */
export const TRAINING_SHOTS = 5;
/** Сколько завершённых тренировок в день дают опыт. Дальше — без награды. */
export const REWARDED_SESSIONS_PER_DAY = 5;
/** Незавершённая тренировка сгорает через 30 минут и опыта не даёт. */
export const SESSION_TTL_MS = 30 * 60 * 1000;
/** Удар быстрее анимации предыдущего — признак бота. */
export const MIN_SHOT_INTERVAL_MS = 1500;

// ─── Мишень ───────────────────────────────────────────────────────────────────

export type Zone = "center" | "middle" | "outer" | "miss";

/** Радиусы колец мишени, м — от центра мишени до центра мяча. */
export const TARGET_RINGS = { center: 0.22, middle: 0.45, outer: 0.7 } as const;

export const ZONE_POINTS: Record<Zone, number> = { center: 100, middle: 60, outer: 30, miss: 0 };

/** Центр мишени в плоскости ворот, м: x — поперёк, y — высота. */
export type Target = { x: number; y: number };

/**
 * Зона, где может стоять центр мишени: сбоку от вратаря (он стоит в центре
 * и корпусом закрывает |x| < ~0.6 м) и внутри створа по высоте.
 */
export const TARGET_X_RANGE: [number, number] = [1.2, 2.8];
export const TARGET_Y_RANGE: [number, number] = [0.5, 1.7];

/**
 * Мишень для удара из 32-битного seed. Сервер берёт seed из
 * sha256(sessionId:shotNo), так что мишень выбирает он, а не клиент.
 */
export function targetFromSeed(seed: number): Target {
  const rand = mulberry32(seed);
  const side = rand() < 0.5 ? -1 : 1;
  const [x0, x1] = TARGET_X_RANGE;
  const [y0, y1] = TARGET_Y_RANGE;
  return { x: round(side * (x0 + rand() * (x1 - x0))), y: round(y0 + rand() * (y1 - y0)) };
}

function mulberry32(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Зона попадания по расстоянию от центра мишени до центра мяча. Граница кольца — ещё в кольце. */
export function zoneFor(ball: { x: number; y: number }, target: Target): Zone {
  // Координаты — в сантиметрах; допуск гасит ошибку float (2.22 − 2 = 0.22000000000000020).
  const d = Math.hypot(ball.x - target.x, ball.y - target.y) - 1e-9;
  if (d <= TARGET_RINGS.center) return "center";
  if (d <= TARGET_RINGS.middle) return "middle";
  if (d <= TARGET_RINGS.outer) return "outer";
  return "miss";
}

export function pointsFor(zone: Zone): number {
  return ZONE_POINTS[zone];
}

// ─── Итог тренировки ─────────────────────────────────────────────────────────

/** Пороги звёзд из максимума 500: 1★ от 150, 2★ от 300, 3★ от 420. */
export const STAR_THRESHOLDS = [150, 300, 420] as const;

export type Stars = 0 | 1 | 2 | 3;

export function starsFor(score: number): Stars {
  let stars = 0;
  for (const t of STAR_THRESHOLDS) if (score >= t) stars++;
  return stars as Stars;
}

/** Опыт точности за тренировку: round(score / 10) + 5·звёзды; вне дневного лимита — 0. */
export function xpFor(score: number, stars: Stars, rewarded = true): number {
  if (!rewarded) return 0;
  return Math.round(Math.max(0, score) / 10) + 5 * stars;
}

/** Сколько тренировок сегодня ещё дадут опыт. */
export function rewardedSessionsLeft(rewardedFinishedToday: number): number {
  return Math.max(0, REWARDED_SESSIONS_PER_DAY - Math.max(0, rewardedFinishedToday));
}

// ─── Удар ────────────────────────────────────────────────────────────────────

export type TrainingShotOutcome = ShotOutcome & {
  /** Вратарь стоит и не прыгает — сцена оставляет его в idle. */
  keeperPassive: true;
  target: Target;
  zone: Zone;
};

/**
 * Удар по мишени. Прицел, сила, закрутка и тип удара работают как в пенальти;
 * точность лишь сужает случайный разброс вокруг точки прицела. Мишень на
 * полёт мяча не влияет никак — только на подсчёт зоны.
 */
export function simulateTrainingShot(
  input: ShotInput,
  rand: Random,
  accuracyLevel: number,
  target: Target,
): TrainingShotOutcome {
  const plan = shotPlan(input, "penalty", PENALTY_SPOT);
  const spread = plan.spread * accuracySpreadScale(accuracyLevel);

  let x = plan.x + gaussian(rand) * spread;
  let y = finalHeight(plan.y + gaussian(rand) * spread * 0.7, input.power, plan.over);
  const lift = liftFor(false, input.aimY, input.power, y, input.kind, input.shape);
  const wobble = wobbleFor(input);

  const frame = goalFrameResult(x, y);
  // Зона — по той же точке, что увидит игрок (округлённой), и только в створе.
  const zone = frame === "inside" ? zoneFor({ x: round(x), y: round(y) }, target) : "miss";
  if (frame === "miss") ({ x, y } = missFlightPoint(x, y));

  return {
    mode: "penalty",
    level: "amateur",
    result: frame === "inside" ? "goal" : frame,
    origin: PENALTY_SPOT,
    wall: null,
    ball: {
      x: round(x),
      y: round(y),
      flightMs: plan.flightMs,
      curveM: round(plan.curveM),
      lift: round(lift),
      pace: round(plan.pace),
      ...(wobble ? { wobble } : {}),
    },
    // Руки там же, где вратарь стоит; «прыжок» так и не начинается.
    keeper: { startMs: Number.MAX_SAFE_INTEGER, startX: 0, handX: 0, handY: BALL_RADIUS, diveMs: 0, guessed: false },
    keeperPassive: true,
    topCorner: false,
    points: pointsFor(zone),
    coins: 0,
    target,
    zone,
  };
}

// ─── Сессия ──────────────────────────────────────────────────────────────────

export type SessionStatus = "active" | "finished" | "expired";

export type TrainingSessionState = {
  status: SessionStatus;
  shotsTaken: number;
  score: number;
  /** Время старта и последнего удара, мс (epoch). */
  createdAt: number;
  lastShotAt: number | null;
};

export type ShotRejection = "not-active" | "expired" | "complete" | "too-fast";

export function isExpired(session: TrainingSessionState, now: number): boolean {
  return now - session.createdAt > SESSION_TTL_MS;
}

/** Можно ли бить следующий удар. Порядок проверок — как в SQL training_record_shot. */
export function checkShot(session: TrainingSessionState, now: number): { ok: true; shotNo: number } | { ok: false; reason: ShotRejection } {
  if (session.status !== "active") return { ok: false, reason: "not-active" };
  if (isExpired(session, now)) return { ok: false, reason: "expired" };
  if (session.shotsTaken >= TRAINING_SHOTS) return { ok: false, reason: "complete" };
  if (session.lastShotAt != null && now - session.lastShotAt < MIN_SHOT_INTERVAL_MS) return { ok: false, reason: "too-fast" };
  return { ok: true, shotNo: session.shotsTaken + 1 };
}

/** Записать удар. Бросает, если удар недопустим — сначала вызывайте checkShot. */
export function applyShot(session: TrainingSessionState, points: number, now: number): TrainingSessionState {
  const check = checkShot(session, now);
  if (!check.ok) throw new Error(`training shot rejected: ${check.reason}`);
  return { ...session, shotsTaken: check.shotNo, score: session.score + points, lastShotAt: now };
}

export type FinishResult =
  | { ok: true; session: TrainingSessionState; stars: Stars; rewarded: boolean; xp: number }
  | { ok: false; reason: "already-finished" | "not-complete" };

/**
 * Завершить тренировку после пятого удара. Опыт начисляется только при переходе
 * active → finished: повторный вызов по той же сессии вернёт already-finished
 * и ничего не начислит. `rewardedFinishedToday` — сколько тренировок сегодня
 * уже получили опыт.
 */
export function finishSession(session: TrainingSessionState, rewardedFinishedToday: number): FinishResult {
  if (session.status !== "active") return { ok: false, reason: "already-finished" };
  if (session.shotsTaken < TRAINING_SHOTS) return { ok: false, reason: "not-complete" };
  const stars = starsFor(session.score);
  const rewarded = rewardedSessionsLeft(rewardedFinishedToday) > 0;
  return { ok: true, session: { ...session, status: "finished" }, stars, rewarded, xp: xpFor(session.score, stars, rewarded) };
}
