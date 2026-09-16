/**
 * Модель пенальти «Забей гол». Чистые функции без зависимостей: исход удара
 * считает сервер (клиенту доверять нельзя), а клиент по тем же формулам
 * рисует полёт мяча и прыжок вратаря.
 *
 * Система координат — в метрах, как на настоящем поле:
 *   x — поперёк ворот (0 — центр, ворота от -3.66 до 3.66),
 *   y — высота (0 — газон, перекладина на 2.44),
 *   z — расстояние от линии ворот (точка пенальти на 11 м).
 */

export const GOAL_HALF_WIDTH = 3.66;
export const GOAL_HEIGHT = 2.44;
export const PENALTY_DISTANCE = 11;
export const BALL_RADIUS = 0.11;

/** Что прислал клиент после свайпа. Все значения нормализованы и ограничиваются на сервере. */
export type ShotInput = {
  /** Прицел по ширине: -1 — левая штанга, 1 — правая, за пределами ±1 — мимо. */
  aimX: number;
  /** Прицел по высоте: 0 — по газону, 1 — под перекладину. */
  aimY: number;
  /** Сила: 0..1 (скорость свайпа). */
  power: number;
  /** Закрутка: -1..1 (изгиб траектории свайпа). */
  curve: number;
};

export type ShotResult = "goal" | "saved" | "post" | "miss" | "wall";

export type GameMode = "penalty" | "freekick";

/** Точка удара: x — поперёк поля, z — расстояние до линии ворот. */
export type KickSpot = { x: number; z: number };

/** Стенка штрафного: центр, половина ширины и высота в прыжке. */
export type Wall = { x: number; z: number; halfWidth: number; top: number; count: number };

export const PENALTY_SPOT: KickSpot = { x: 0, z: PENALTY_DISTANCE };
/** Стенка на правильном расстоянии 9.15 м. */
export const WALL_DISTANCE = 9.15;

export type ShotOutcome = {
  mode: GameMode;
  result: ShotResult;
  origin: KickSpot;
  wall: Wall | null;
  /** Куда реально прилетел мяч в плоскости ворот (с учётом неточности удара). */
  ball: { x: number; y: number; flightMs: number; curveM: number; lift: number };
  /** Прыжок вратаря: куда и когда он двинулся и где оказались его руки. */
  keeper: { startMs: number; startX: number; handX: number; handY: number; diveMs: number; guessed: boolean };
  /** «Девятка» — угол под перекладиной. */
  topCorner: boolean;
  points: number;
  coins: number;
};

/** Источник случайности: сервер даёт криптостойкий, тесты — детерминированный. */
export type Random = () => number;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function sanitizeInput(raw: Partial<ShotInput>): ShotInput | null {
  const nums = [raw.aimX, raw.aimY, raw.power, raw.curve];
  if (nums.some((n) => typeof n !== "number" || !Number.isFinite(n))) return null;
  return {
    aimX: clamp(raw.aimX!, -1.6, 1.6),
    aimY: clamp(raw.aimY!, 0, 1.6),
    power: clamp(raw.power!, 0, 1),
    curve: clamp(raw.curve!, -1, 1),
  };
}

/** Нормальное распределение (Бокс — Мюллер). */
function gaussian(rand: Random) {
  const u = Math.max(1e-9, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Стенка штрафного: стоит на 9.15 м от мяча на линии к ближней штанге и
 * закрывает её. Число игроков — от угла: чем ближе к центру, тем больше.
 */
export function wallFor(spot: KickSpot): Wall {
  const nearPostX = spot.x === 0 ? 0 : Math.sign(spot.x) * GOAL_HALF_WIDTH * 0.45;
  const dx = nearPostX - spot.x;
  const dz = -spot.z;
  const len = Math.hypot(dx, dz);
  const k = WALL_DISTANCE / len;
  const count = Math.abs(spot.x) > 10 ? 3 : 4;
  return {
    x: round(spot.x + dx * k),
    z: round(spot.z + dz * k),
    halfWidth: count * 0.27,
    top: 1.85 + 0.25, // рост плюс прыжок
    count,
  };
}

export function simulateShot(input: ShotInput, rand: Random, mode: GameMode = "penalty", spot: KickSpot = PENALTY_SPOT): ShotOutcome {
  const { aimX, aimY, power, curve } = input;
  const freekick = mode === "freekick";
  const origin = freekick ? spot : PENALTY_SPOT;
  const distance = Math.hypot(origin.x, origin.z);

  // Скорость и время полёта: слабый удар ~55 км/ч, пушечный ~115 км/ч.
  const speed = (freekick ? 18 : 15) + power * (freekick ? 14 : 17); // м/с
  const flightMs = Math.round((distance / speed) * 1000);

  // Неточность: чем сильнее бьёшь, тем больше разброс. Со штрафного — дальше, значит, разброс больше.
  const spread = (freekick ? 0.22 : 0.12) + Math.pow(power, 3) * (freekick ? 0.75 : 0.55) + Math.abs(curve) * 0.1;
  const curveM = curve * (freekick ? 2.3 : 1.1);
  let x = aimX * GOAL_HALF_WIDTH + curveM * 0.35 + gaussian(rand) * spread;
  let y = aimY * GOAL_HEIGHT + gaussian(rand) * spread * 0.7;
  if (power < 0.3) y *= 0.55 + power;
  y = Math.max(BALL_RADIUS, y);

  // Дуга: мягкий удар выше навесом, со штрафного — чтобы перелететь стенку.
  const lift = freekick ? 0.8 + aimY * 0.8 + (1 - power) * 0.9 : Math.min(0.9, y * 0.25);

  const nearPost = Math.abs(Math.abs(x) - GOAL_HALF_WIDTH) < BALL_RADIUS * 1.05 && y < GOAL_HEIGHT + BALL_RADIUS;
  const nearBar = Math.abs(y - GOAL_HEIGHT) < BALL_RADIUS * 1.05 && Math.abs(x) < GOAL_HALF_WIDTH + BALL_RADIUS;
  const inside = Math.abs(x) < GOAL_HALF_WIDTH - BALL_RADIUS && y < GOAL_HEIGHT - BALL_RADIUS;

  const wall = freekick ? wallFor(origin) : null;
  let blockedByWall = false;
  if (wall) {
    const t = (origin.z - wall.z) / origin.z;
    const p = trajectoryPoint({ origin, ball: { x, y, curveM, lift } }, t);
    blockedByWall = Math.abs(p.x - wall.x) < wall.halfWidth + BALL_RADIUS && p.y < wall.top + BALL_RADIUS;
  }

  const keeper = keeperDive({ x, y, flightMs, curve, power, freekick, startX: wall ? -Math.sign(wall.x || 1) * 0.9 : 0 }, rand);

  let result: ShotResult;
  if (blockedByWall) result = "wall";
  else if (nearPost || nearBar) result = "post";
  else if (!inside) result = "miss";
  else result = keeper.saves ? "saved" : "goal";

  if (result === "miss") {
    // Для анимации «мимо» мяч улетает за каркас, а не пролетает сквозь сетку.
    if (Math.abs(x) < GOAL_HALF_WIDTH + 0.3 && y >= GOAL_HEIGHT) y = Math.max(y, GOAL_HEIGHT + 0.35);
    else if (Math.abs(x) < GOAL_HALF_WIDTH + 0.3) x = Math.sign(x || 1) * (GOAL_HALF_WIDTH + 0.35);
  }

  const topCorner = result === "goal" && Math.abs(x) > GOAL_HALF_WIDTH * 0.62 && y > GOAL_HEIGHT * 0.62;
  const basePoints = freekick ? 2 : 1;

  return {
    mode,
    result,
    origin,
    wall,
    ball: { x: round(x), y: round(y), flightMs, curveM: round(curveM), lift: round(lift) },
    keeper: {
      startMs: keeper.startMs,
      startX: keeper.startX,
      handX: round(keeper.handX),
      handY: round(keeper.handY),
      diveMs: keeper.diveMs,
      guessed: keeper.guessed,
    },
    topCorner,
    points: result === "goal" ? basePoints + (topCorner ? 1 : 0) : 0,
    coins: result === "goal" ? (freekick ? 10 : 5) + (topCorner ? 5 : 0) : 0,
  };
}

const round = (v: number) => Math.round(v * 100) / 100;

/**
 * Вратарь. Два поведения, как у настоящих:
 *  - иногда (30%) угадывает сторону заранее и прыгает с началом удара;
 *  - иначе ждёт, реагирует на мяч (0.15–0.24 с) и прыгает туда, куда тот летит,
 *    с ошибкой оценки — сильнее при сильном и закрученном ударе.
 * Сейв — если к моменту прилёта мяча руки успели оказаться рядом.
 */
function keeperDive(
  shot: { x: number; y: number; flightMs: number; curve: number; power: number; freekick: boolean; startX: number },
  rand: Random,
) {
  const DIVE_SPEED = 7.4; // м/с вбок
  const RISE_SPEED = 4.8; // м/с вверх
  const MAX_REACH_X = 3.45;
  const STANDING_REACH_X = 0.75; // шаг и руки без прыжка
  const HAND_RADIUS = 0.6; // «ладони» + размер мяча

  // Со штрафного вратарь прячется за стенкой: реже угадывает и позже видит мяч.
  const guessed = rand() < (shot.freekick ? 0.15 : 0.3);
  let targetX: number;
  let targetY: number;
  let startMs: number;

  if (guessed) {
    const side = rand() < 0.5 ? -1 : 1;
    targetX = side * (1.9 + rand() * 1.5);
    targetY = 0.3 + rand() * 1.8;
    startMs = 0;
  } else {
    const reactionMs = (shot.freekick ? 360 : 150) + rand() * 90;
    const readError = 0.18 + Math.pow(shot.power, 2) * 0.5 + Math.abs(shot.curve) * (shot.freekick ? 0.8 : 0.3) + (shot.freekick ? 0.15 : 0);
    targetX = shot.x + gaussian(rand) * readError;
    targetY = shot.y + gaussian(rand) * readError * 0.6;
    startMs = reactionMs;
  }

  const available = Math.max(0, shot.flightMs - startMs) / 1000;
  // Вратарь прыгает от своей позиции (со штрафного он смещён от стенки).
  const rel = targetX - shot.startX;
  const reach = Math.min(Math.abs(rel), STANDING_REACH_X + DIVE_SPEED * available, MAX_REACH_X);
  const handX = Math.max(-GOAL_HALF_WIDTH, Math.min(GOAL_HALF_WIDTH, shot.startX + Math.sign(rel) * reach));
  const reachX = Math.abs(handX);
  // Высоко и далеко одновременно не достать: в прыжке в угол руки ниже.
  const maxY = 2.4 - Math.max(0, reachX - 2.6) * 0.45;
  const handY = clamp(Math.min(targetY, 0.9 + RISE_SPEED * available), 0.2, maxY);

  const dist = Math.hypot(handX - shot.x, handY - shot.y);
  // Мяч в корпус (центр, невысоко) вратарь берёт почти всегда.
  const bodyBlock = Math.abs(shot.x - shot.startX) < 0.55 && shot.y < 1.9;
  const saves = bodyBlock || dist < HAND_RADIUS;

  const diveMs = Math.round(Math.max(120, Math.min(available * 1000, (reach / DIVE_SPEED) * 1000 + 80)));
  return { handX, handY, startX: shot.startX, startMs: Math.round(startMs), diveMs, guessed, saves };
}

/** Точка на траектории мяча в момент t (0..1): от точки удара к воротам, с изгибом и дугой. */
function trajectoryPoint(
  o: { origin: KickSpot; ball: { x: number; y: number; curveM: number; lift: number } },
  t: number,
) {
  const k = clamp(t, 0, 1);
  const { x, y, curveM, lift } = o.ball;
  // Боковой изгиб сильнее в середине полёта — как у закрученного удара.
  const bend = Math.sin(Math.PI * k) * curveM * 0.6;
  const arc = Math.sin(Math.PI * k) * lift;
  return {
    x: o.origin.x + (x - o.origin.x) * k + bend,
    y: BALL_RADIUS + (y - BALL_RADIUS) * k + arc,
    z: o.origin.z * (1 - k),
  };
}

export function ballPosition(outcome: ShotOutcome, t: number) {
  return trajectoryPoint(outcome, t);
}

/**
 * Точка штрафного для попытки — детерминирована от игрока, дня и номера
 * попытки: сервер показывает её до удара и считает удар с той же точки.
 */
export function freeKickSpotFromSeed(seed: number): KickSpot {
  const r1 = ((seed * 9301 + 49297) % 233280) / 233280;
  const r2 = ((seed * 4271 + 13) % 104729) / 104729;
  const z = 19.5 + r1 * 6; // 19.5–25.5 м
  const side = r2 < 0.5 ? -1 : 1;
  const x = side * (2 + Math.abs(r2 - 0.5) * 2 * 11); // 2–13 м от центра
  return { x: round(x), z: round(z) };
}
