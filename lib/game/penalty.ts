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

export type ShotResult = "goal" | "saved" | "post" | "miss";

export type ShotOutcome = {
  result: ShotResult;
  /** Куда реально прилетел мяч в плоскости ворот (с учётом неточности удара). */
  ball: { x: number; y: number; flightMs: number; curveM: number };
  /** Прыжок вратаря: куда и когда он двинулся и где оказались его руки. */
  keeper: { startMs: number; handX: number; handY: number; diveMs: number; guessed: boolean };
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

export function simulateShot(input: ShotInput, rand: Random): ShotOutcome {
  const { aimX, aimY, power, curve } = input;

  // Скорость и время полёта: слабый удар ~55 км/ч, пушечный ~115 км/ч.
  const speed = 15 + power * 17; // м/с
  const flightMs = Math.round((PENALTY_DISTANCE / speed) * 1000);

  // Неточность: чем сильнее бьёшь, тем больше разброс. Закрутка добавляет свой.
  const spread = 0.12 + Math.pow(power, 3) * 0.55 + Math.abs(curve) * 0.1;
  const curveM = curve * 1.1;
  let x = aimX * GOAL_HALF_WIDTH + curveM * 0.35 + gaussian(rand) * spread;
  let y = aimY * GOAL_HEIGHT + gaussian(rand) * spread * 0.7;
  // Слабый удар «проседает» — мяч не долетает высоко.
  if (power < 0.3) y *= 0.55 + power;
  y = Math.max(BALL_RADIUS, y);

  // Штанга / перекладина: мяч касается каркаса.
  const nearPost = Math.abs(Math.abs(x) - GOAL_HALF_WIDTH) < BALL_RADIUS * 1.05 && y < GOAL_HEIGHT + BALL_RADIUS;
  const nearBar = Math.abs(y - GOAL_HEIGHT) < BALL_RADIUS * 1.05 && Math.abs(x) < GOAL_HALF_WIDTH + BALL_RADIUS;
  const inside = Math.abs(x) < GOAL_HALF_WIDTH - BALL_RADIUS && y < GOAL_HEIGHT - BALL_RADIUS;

  const keeper = keeperDive({ x, y, flightMs, curve, power }, rand);

  let result: ShotResult;
  if (nearPost || nearBar) result = "post";
  else if (!inside) result = "miss";
  else result = keeper.saves ? "saved" : "goal";

  if (result === "miss") {
    // Для анимации «мимо» мяч улетает за каркас, а не пролетает сквозь сетку.
    if (Math.abs(x) < GOAL_HALF_WIDTH + 0.3 && y >= GOAL_HEIGHT) y = Math.max(y, GOAL_HEIGHT + 0.35);
    else if (Math.abs(x) < GOAL_HALF_WIDTH + 0.3) x = Math.sign(x || 1) * (GOAL_HALF_WIDTH + 0.35);
  }

  const topCorner = result === "goal" && Math.abs(x) > GOAL_HALF_WIDTH * 0.62 && y > GOAL_HEIGHT * 0.62;

  return {
    result,
    ball: { x: round(x), y: round(y), flightMs, curveM: round(curveM) },
    keeper: {
      startMs: keeper.startMs,
      handX: round(keeper.handX),
      handY: round(keeper.handY),
      diveMs: keeper.diveMs,
      guessed: keeper.guessed,
    },
    topCorner,
    points: result === "goal" ? (topCorner ? 2 : 1) : 0,
    coins: result === "goal" ? (topCorner ? 10 : 5) : 0,
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
  shot: { x: number; y: number; flightMs: number; curve: number; power: number },
  rand: Random,
) {
  const DIVE_SPEED = 7.4; // м/с вбок
  const RISE_SPEED = 4.8; // м/с вверх
  const MAX_REACH_X = 3.45;
  const STANDING_REACH_X = 0.75; // шаг и руки без прыжка
  const HAND_RADIUS = 0.6; // «ладони» + размер мяча

  const guessed = rand() < 0.3;
  let targetX: number;
  let targetY: number;
  let startMs: number;

  if (guessed) {
    const side = rand() < 0.5 ? -1 : 1;
    targetX = side * (1.9 + rand() * 1.5);
    targetY = 0.3 + rand() * 1.8;
    startMs = 0;
  } else {
    const reactionMs = 150 + rand() * 90;
    const readError = 0.18 + Math.pow(shot.power, 2) * 0.5 + Math.abs(shot.curve) * 0.3;
    targetX = shot.x + gaussian(rand) * readError;
    targetY = shot.y + gaussian(rand) * readError * 0.6;
    startMs = reactionMs;
  }

  const available = Math.max(0, shot.flightMs - startMs) / 1000;
  const reachX = Math.min(Math.abs(targetX), STANDING_REACH_X + DIVE_SPEED * available, MAX_REACH_X);
  const handX = Math.sign(targetX) * reachX;
  // Высоко и далеко одновременно не достать: в прыжке в угол руки ниже.
  const maxY = 2.4 - Math.max(0, reachX - 2.6) * 0.45;
  const handY = clamp(Math.min(targetY, 0.9 + RISE_SPEED * available), 0.2, maxY);

  const dist = Math.hypot(handX - shot.x, handY - shot.y);
  // Мяч в корпус (центр, невысоко) вратарь берёт почти всегда.
  const bodyBlock = Math.abs(shot.x) < 0.55 && shot.y < 1.9;
  const saves = bodyBlock || dist < HAND_RADIUS;

  const diveMs = Math.round(Math.max(120, Math.min(available * 1000, (reachX / DIVE_SPEED) * 1000 + 80)));
  return { handX, handY, startMs: Math.round(startMs), diveMs, guessed, saves };
}

/** Точка на траектории мяча в момент t (0..1) — для анимации на клиенте. */
export function ballPosition(outcome: ShotOutcome, t: number) {
  const { x, y, curveM } = outcome.ball;
  const k = clamp(t, 0, 1);
  // Боковой изгиб сильнее в середине полёта — как у закрученного удара.
  const bend = Math.sin(Math.PI * k) * curveM * 0.6;
  const lift = Math.sin(Math.PI * k) * Math.min(0.9, y * 0.25);
  return {
    x: x * k + bend,
    y: BALL_RADIUS + (y - BALL_RADIUS) * k + lift,
    z: PENALTY_DISTANCE * (1 - k),
  };
}
