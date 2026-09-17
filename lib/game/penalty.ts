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

/**
 * Тип удара — выбирает игрок перед ударом.
 *  straight — прямой: без закрутки, низко и чуть быстрее;
 *  curl — крученый: изгиб от дуги свайпа, вратарю сложнее читать;
 *  lob — «парашют»: медленный навес высокой дугой, бьёт вратаря, который уже прыгнул;
 *  knuckle — наклбол: без вращения, мяч «плавает» в полёте, вратарь читает плохо.
 */
export type ShotKind = "straight" | "curl" | "lob" | "knuckle";
export const SHOT_KINDS: ShotKind[] = ["straight", "curl", "lob", "knuckle"];

/** Что прислал клиент: сила со шкалы и прицел свайпом. Все значения ограничиваются на сервере. */
export type ShotInput = {
  kind: ShotKind;
  /** Прицел по ширине: -1 — левая штанга, 1 — правая, за пределами ±1 — мимо. */
  aimX: number;
  /** Прицел по высоте: 0 — по газону, 1 — под перекладину. */
  aimY: number;
  /** Сила: положение шкалы 0..1 (сколько держали палец). */
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
  ball: {
    x: number;
    y: number;
    flightMs: number;
    curveM: number;
    lift: number;
    pace: number;
    /** Наклбол: амплитуда (м) и фаза «плавания» мяча в полёте. */
    wobble?: { amp: number; phase: number };
  };
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
    // Старый клиент без типа удара бил «как свайпнул» — это крученый.
    kind: SHOT_KINDS.includes(raw.kind as ShotKind) ? (raw.kind as ShotKind) : "curl",
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

/** Рабочая зона шкалы силы: ниже — недобор (мяч катится), выше — перебор (теряется точность). */
export const POWER_SWEET_MIN = 0.35;
export const POWER_SWEET_MAX = 0.95;

/**
 * Шкала силы → темп удара. `pace` 0..1 — где удар внутри рабочей зоны (0 и в недоборе),
 * `over` 0..1 — насколько залезли в перебор.
 */
export function powerProfile(power: number) {
  const g = clamp(power, 0, 1);
  return {
    g,
    weak: g < POWER_SWEET_MIN,
    pace: clamp((g - POWER_SWEET_MIN) / (POWER_SWEET_MAX - POWER_SWEET_MIN), 0, 1),
    over: clamp((g - POWER_SWEET_MAX) / (1 - POWER_SWEET_MAX), 0, 1),
  };
}

/**
 * Скорость мяча, м/с. Пенальти: недобор 9–15 (32–54 км/ч), рабочая зона 15–32
 * (54–115 км/ч), перебор до 33. Штрафной: 12–18, 18–32, до 33.
 */
export function shotSpeed(power: number, freekick: boolean, kind: ShotKind = "curl") {
  const { g, weak, pace, over } = powerProfile(power);
  const base = freekick ? 18 : 15;
  const speed = weak ? base - 6 + (g / POWER_SWEET_MIN) * 6 : base + pace * (freekick ? 14 : 17) + over;
  // Парашют — мягкий подсечённый удар; прямой в подъём — чуть быстрее.
  return kind === "lob" ? speed * 0.7 : kind === "straight" ? speed + 1 : speed;
}

/** Высота после недобора: слабый удар не поднимается и катится низом. */
function finalHeight(y: number, power: number, over: number) {
  let h = y + over * 0.3;
  if (power < POWER_SWEET_MIN) h *= 0.6 + power;
  return Math.max(BALL_RADIUS, h);
}

/**
 * Дуга: мягкий удар выше навесом, со штрафного — чтобы перелететь стенку.
 * Недобор со штрафного так не работает: вялый удар не поднимается над стенкой.
 */
function liftFor(freekick: boolean, aimY: number, power: number, y: number, kind: ShotKind) {
  const { pace, weak, g } = powerProfile(power);
  if (kind === "lob") {
    // Высокая дуга: пик над вратарём, мяч падает сверху.
    const lift = (freekick ? 1.6 + aimY * 0.5 : 1.5) + (1 - pace) * 0.6;
    return weak ? lift * (0.4 + 0.6 * (g / POWER_SWEET_MIN)) : lift;
  }
  // Прямой и наклбол идут ниже; со штрафного их всё же поднимают над стенкой (наклбол Роналду).
  const flat = kind === "straight" || kind === "knuckle" ? (freekick ? 0.9 : 0.6) : 1;
  if (!freekick) return Math.min(0.9, y * 0.25) * flat;
  const lift = 0.8 + aimY * 0.8 + (1 - pace) * 0.9;
  return (weak ? lift * (0.3 + 0.7 * (g / POWER_SWEET_MIN)) : lift) * flat;
}

/** Прицел без случайности: куда полетит мяч, если удар получится идеально. */
/** Насколько закрутка со свайпа переходит в изгиб траектории для каждого типа удара. */
const CURVE_FACTOR: Record<ShotKind, number> = { straight: 0, curl: 1, lob: 0.4, knuckle: 0 };
/** Разброс относительно крученого: мягкий парашют точнее, наклбол — капризнее. */
const SPREAD_FACTOR: Record<ShotKind, number> = { straight: 0.9, curl: 1, lob: 1, knuckle: 1.3 };

function shotPlan(input: ShotInput, mode: GameMode, spot: KickSpot) {
  const { aimX, aimY, power, curve, kind } = input;
  const freekick = mode === "freekick";
  const origin = freekick ? spot : PENALTY_SPOT;
  const { pace, over } = powerProfile(power);
  const speed = shotSpeed(power, freekick, kind);
  const curveM = curve * CURVE_FACTOR[kind] * (freekick ? 2.3 : 1.1);
  return {
    freekick,
    origin,
    pace,
    over,
    flightMs: Math.round((Math.hypot(origin.x, origin.z) / speed) * 1000),
    curveM,
    x: aimX * GOAL_HALF_WIDTH + curveM * 0.35,
    y: aimY * GOAL_HEIGHT,
    // Неточность: чем сильнее бьёшь, тем больше разброс; перебор добавляет ещё. Со штрафного — дальше, разброс больше.
    spread:
      ((freekick ? 0.22 : 0.12) +
        Math.pow(pace, 3) * (freekick ? 0.75 : 0.55) +
        Math.abs(curveM) * 0.05 +
        over * (freekick ? 0.5 : 0.35)) *
      SPREAD_FACTOR[kind],
  };
}

/**
 * Пунктир прицела: первые `fraction` траектории идеального удара.
 * Разброс, вратарь и стенка не учитываются — исход по-прежнему решает simulateShot.
 */
export function previewPath(input: ShotInput, mode: GameMode, spot: KickSpot, fraction = 0.7, steps = 24) {
  const plan = shotPlan(input, mode, spot);
  const y = finalHeight(plan.y, input.power, plan.over);
  // Наклбол в прицеле без «плавания»: куда его понесёт — неизвестно до удара.
  const ball = { x: plan.x, y, curveM: plan.curveM, lift: liftFor(plan.freekick, input.aimY, input.power, y, input.kind) };
  return Array.from({ length: steps + 1 }, (_, i) => trajectoryPoint({ origin: plan.origin, ball }, (i / steps) * fraction));
}

/*
 * Мяч быстрее всего сразу после касания и теряет скорость в воздухе. Время
 * прилёта не меняется — меняется только распределение пути по времени, поэтому
 * тайминги вратаря остаются прежними. Сильный удар резче «выстреливает».
 */
const dragFor = (pace: number) => 0.35 + pace * 0.55;

/** Доля пройденного пути к доле времени полёта. */
export function flightProgress(timeFraction: number, pace: number) {
  const c = dragFor(pace);
  return (1 - Math.exp(-c * clamp(timeFraction, 0, 1))) / (1 - Math.exp(-c));
}

/** Обратное к flightProgress: когда мяч пройдёт долю пути `pathFraction`. */
export function flightTimeAt(pathFraction: number, pace: number) {
  const c = dragFor(pace);
  return -Math.log(1 - clamp(pathFraction, 0, 1) * (1 - Math.exp(-c))) / c;
}

export function simulateShot(input: ShotInput, rand: Random, mode: GameMode = "penalty", spot: KickSpot = PENALTY_SPOT): ShotOutcome {
  const { aimY, power, kind } = input;
  const plan = shotPlan(input, mode, spot);
  const { freekick, origin, pace, flightMs, curveM, spread } = plan;

  let x = plan.x + gaussian(rand) * spread;
  let y = finalHeight(plan.y + gaussian(rand) * spread * 0.7, power, plan.over);
  const lift = liftFor(freekick, aimY, power, y, kind);
  // Наклбол «плавает» в середине полёта; к воротам приходит в точку, но вратарь его читает плохо.
  const wobble = kind === "knuckle" ? { amp: round(0.3 + rand() * 0.45), phase: round(rand() * Math.PI * 2) } : undefined;

  const nearPost = Math.abs(Math.abs(x) - GOAL_HALF_WIDTH) < BALL_RADIUS * 1.05 && y < GOAL_HEIGHT + BALL_RADIUS;
  const nearBar = Math.abs(y - GOAL_HEIGHT) < BALL_RADIUS * 1.05 && Math.abs(x) < GOAL_HALF_WIDTH + BALL_RADIUS;
  const inside = Math.abs(x) < GOAL_HALF_WIDTH - BALL_RADIUS && y < GOAL_HEIGHT - BALL_RADIUS;

  const wall = freekick ? wallFor(origin) : null;
  let blockedByWall = false;
  if (wall) {
    const t = (origin.z - wall.z) / origin.z;
    const p = trajectoryPoint({ origin, ball: { x, y, curveM, lift, wobble } }, t);
    blockedByWall = Math.abs(p.x - wall.x) < wall.halfWidth + BALL_RADIUS && p.y < wall.top + BALL_RADIUS;
  }

  const keeper = keeperDive({ x, y, flightMs, curveM, kind, power: pace, freekick, startX: wall ? -Math.sign(wall.x || 1) * 0.9 : 0 }, rand);

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
    ball: { x: round(x), y: round(y), flightMs, curveM: round(curveM), lift: round(lift), pace: round(pace), ...(wobble ? { wobble } : {}) },
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
  shot: { x: number; y: number; flightMs: number; curveM: number; kind: ShotKind; power: number; freekick: boolean; startX: number },
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
    // Крученый и особенно наклбол вратарь читает с ошибкой; прямой — лучше всех.
    const curveErr = Math.min(1, Math.abs(shot.curveM) / (shot.freekick ? 2.3 : 1.1)) * (shot.freekick ? 0.8 : 0.3);
    // Медленный парашют вратарь видит хорошо — его козырь только против прыгнувшего вратаря.
    const kindErr = shot.kind === "knuckle" ? 0.3 : shot.kind === "lob" ? -0.08 : 0;
    const readError = Math.max(0.1, 0.18 + Math.pow(shot.power, 2) * 0.5 + curveErr + kindErr + (shot.freekick ? 0.15 : 0));
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
  // Мяч в корпус (центр, невысоко) вратарь берёт почти всегда. Парашют сверху — не корпусом: его надо достать руками.
  const bodyBlock = shot.kind !== "lob" && Math.abs(shot.x - shot.startX) < 0.55 && shot.y < 1.9;
  // Под парашютом вратарь, который уже прыгнул в угол, отыграть назад не успевает.
  const beatenByLob = shot.kind === "lob" && guessed && Math.abs(handX - shot.x) > 0.8;
  const saves = !beatenByLob && (bodyBlock || dist < HAND_RADIUS);

  const diveMs = Math.round(Math.max(120, Math.min(available * 1000, (reach / DIVE_SPEED) * 1000 + 80)));
  return { handX, handY, startX: shot.startX, startMs: Math.round(startMs), diveMs, guessed, saves };
}

/** Точка на траектории мяча в момент t (0..1): от точки удара к воротам, с изгибом и дугой. */
function trajectoryPoint(
  o: { origin: KickSpot; ball: { x: number; y: number; curveM: number; lift: number; wobble?: { amp: number; phase: number } } },
  t: number,
) {
  const k = clamp(t, 0, 1);
  const { x, y, curveM, lift, wobble } = o.ball;
  // Боковой изгиб сильнее в середине полёта — как у закрученного удара.
  const bend = Math.sin(Math.PI * k) * curveM * 0.6;
  const arc = Math.sin(Math.PI * k) * lift;
  // Наклбол: мяч «плавает» вбок и вверх-вниз, к концу полёта возвращаясь на курс.
  const sway = wobble ? Math.sin(Math.PI * k) * wobble.amp : 0;
  const phase = wobble?.phase ?? 0;
  const wx = sway * Math.sin(Math.PI * 3 * k + phase);
  const wy = sway * 0.5 * Math.cos(Math.PI * 2.5 * k + phase);
  return {
    x: o.origin.x + (x - o.origin.x) * k + bend + wx,
    y: BALL_RADIUS + (y - BALL_RADIUS) * k + arc + wy,
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
