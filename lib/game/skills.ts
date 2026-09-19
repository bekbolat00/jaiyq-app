/**
 * Характеристики игрока «Забей гол». Чистые функции без зависимостей — их
 * использует и сервер (начисление опыта), и клиент (карточка прогресса).
 *
 * В базе хранится только опыт (`player_skills.xp`), уровень всегда
 * вычисляется из него здесь — у уровня один источник правды.
 */

export type SkillId =
  | "shotPower"
  | "accuracy"
  | "curve"
  | "chip"
  | "longShot"
  | "goalkeeperReaction"
  | "goalkeeperReach"
  | "goalkeeperHandling";

export const SKILL_IDS: SkillId[] = [
  "shotPower",
  "accuracy",
  "curve",
  "chip",
  "longShot",
  "goalkeeperReaction",
  "goalkeeperReach",
  "goalkeeperHandling",
];

/** Какие характеристики уже влияют на игру. Остальные заведены впрок. */
export const ACTIVE_SKILLS: SkillId[] = ["accuracy"];

export const MIN_SKILL_LEVEL = 1;
export const MAX_SKILL_LEVEL = 10;

const clampLevel = (level: number) =>
  Math.min(MAX_SKILL_LEVEL, Math.max(MIN_SKILL_LEVEL, Math.floor(Number.isFinite(level) ? level : MIN_SKILL_LEVEL)));

/** Опыт, с которого начинается уровень: 50·(n−1)·n → 0, 100, 300, 600 … 4500. */
export function xpForLevel(level: number): number {
  const n = clampLevel(level);
  return 50 * (n - 1) * n;
}

/** Уровень по накопленному опыту: 1..10. */
export function levelForXp(xp: number): number {
  const total = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  let level = MIN_SKILL_LEVEL;
  while (level < MAX_SKILL_LEVEL && total >= xpForLevel(level + 1)) level++;
  return level;
}

export type SkillProgress = {
  level: number;
  xp: number;
  /** Опыт начала текущего уровня. */
  levelXp: number;
  /** Опыт следующего уровня; null — уровень максимальный. */
  nextLevelXp: number | null;
};

export function skillProgress(xp: number): SkillProgress {
  const total = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  const level = levelForXp(total);
  return {
    level,
    xp: total,
    levelXp: xpForLevel(level),
    nextLevelXp: level < MAX_SKILL_LEVEL ? xpForLevel(level + 1) : null,
  };
}

/** Шаг уменьшения разброса за уровень точности. */
export const ACCURACY_SPREAD_STEP = 0.025;

/**
 * Множитель физического разброса удара от уровня точности: 1.0 на 1-м уровне
 * (ровно как в матче) до 0.775 на 10-м — не больше −22.5%. Сужается только
 * случайное отклонение вокруг точки прицела; к мишени мяч не подтягивается.
 */
export function accuracySpreadScale(level: number): number {
  return 1 - ACCURACY_SPREAD_STEP * (clampLevel(level) - 1);
}
