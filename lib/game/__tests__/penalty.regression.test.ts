import { describe, expect, it } from "vitest";
import { freeKickSpotFromSeed, KEEPER_LEVELS, SHOT_KINDS, simulateShot, type GameMode, type ShotInput } from "@/lib/game/penalty";

/** Детерминированный генератор (mulberry32) — одинаковая «случайность» при каждом прогоне. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Страховка матчевых режимов: исходы пенальти и штрафного зафиксированы снапшотом,
 * снятым до появления тренировочного центра. Любое изменение физики матча уронит тест.
 */
describe("simulateShot — регрессия пенальти и штрафного", () => {
  const aims: Pick<ShotInput, "aimX" | "aimY" | "power" | "curve" | "shape">[] = [
    { aimX: 0, aimY: 0.3, power: 0.6, curve: 0, shape: 0.5 },
    { aimX: -0.85, aimY: 0.85, power: 0.9, curve: 0.7, shape: 0.2 },
    { aimX: 0.7, aimY: 0.1, power: 0.2, curve: -0.4, shape: 0.9 },
    { aimX: 1.2, aimY: 1.1, power: 1, curve: -1, shape: 0.6 },
  ];
  const modes: GameMode[] = ["penalty", "freekick"];

  it("исходы не изменились", () => {
    const out: unknown[] = [];
    let seed = 1;
    for (const mode of modes)
      for (const level of KEEPER_LEVELS)
        for (const kind of SHOT_KINDS)
          for (const aim of aims) {
            const spot = mode === "freekick" ? freeKickSpotFromSeed(seed * 7919) : undefined;
            out.push(simulateShot({ kind, ...aim }, seeded(seed++), mode, spot, level));
          }
    expect(out).toMatchSnapshot();
  });
});
