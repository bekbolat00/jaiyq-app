import { describe, expect, it } from "vitest";
import {
  accuracySpreadScale,
  ACTIVE_SKILLS,
  levelForXp,
  MAX_SKILL_LEVEL,
  MIN_SKILL_LEVEL,
  SKILL_IDS,
  skillProgress,
  xpForLevel,
} from "@/lib/game/skills";

describe("модель характеристик", () => {
  it("восемь характеристик, активна только accuracy", () => {
    expect(SKILL_IDS).toEqual([
      "shotPower",
      "accuracy",
      "curve",
      "chip",
      "longShot",
      "goalkeeperReaction",
      "goalkeeperReach",
      "goalkeeperHandling",
    ]);
    expect(ACTIVE_SKILLS).toEqual(["accuracy"]);
  });
});

describe("уровень из опыта", () => {
  it("пороги уровней 50·(n−1)·n", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500]);
  });

  it("уровень растёт ровно на пороге", () => {
    expect(levelForXp(99)).toBe(2 - 1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(299)).toBe(2);
    expect(levelForXp(300)).toBe(3);
    expect(levelForXp(3599)).toBe(8);
    expect(levelForXp(3600)).toBe(9);
  });

  it("граница уровня 1: ноль, отрицательный и мусорный опыт", () => {
    expect(MIN_SKILL_LEVEL).toBe(1);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(-50)).toBe(1);
    expect(levelForXp(Number.NaN)).toBe(1);
    expect(skillProgress(0)).toEqual({ level: 1, xp: 0, levelXp: 0, nextLevelXp: 100 });
  });

  it("граница уровня 10: выше десятого не растёт", () => {
    expect(MAX_SKILL_LEVEL).toBe(10);
    expect(levelForXp(4499)).toBe(9);
    expect(levelForXp(4500)).toBe(10);
    expect(levelForXp(1_000_000)).toBe(10);
    expect(levelForXp(Number.POSITIVE_INFINITY)).toBe(1); // не число — как ноль, а не максимум
    expect(skillProgress(9999)).toEqual({ level: 10, xp: 9999, levelXp: 4500, nextLevelXp: null });
  });
});

describe("множитель accuracy", () => {
  it("1-й уровень — ровно матчевая физика, 10-й — −22.5%", () => {
    expect(accuracySpreadScale(1)).toBe(1);
    expect(accuracySpreadScale(10)).toBeCloseTo(0.775, 10);
  });

  it("монотонно убывает на 0.025 за уровень", () => {
    for (let l = 2; l <= 10; l++) expect(accuracySpreadScale(l - 1) - accuracySpreadScale(l)).toBeCloseTo(0.025, 10);
  });

  it("за пределами 1..10 зажимается и никогда не даёт больше −22.5%", () => {
    expect(accuracySpreadScale(0)).toBe(1);
    expect(accuracySpreadScale(-5)).toBe(1);
    expect(accuracySpreadScale(11)).toBeCloseTo(0.775, 10);
    expect(accuracySpreadScale(999)).toBeCloseTo(0.775, 10);
    expect(accuracySpreadScale(Number.NaN)).toBe(1);
  });
});
