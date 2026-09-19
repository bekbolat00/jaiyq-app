import { describe, expect, it } from "vitest";
import { GOAL_HALF_WIDTH, GOAL_HEIGHT, shotPlan, PENALTY_SPOT, type ShotInput } from "@/lib/game/penalty";
import {
  applyShot,
  checkShot,
  finishSession,
  MIN_SHOT_INTERVAL_MS,
  pointsFor,
  REWARDED_SESSIONS_PER_DAY,
  rewardedSessionsLeft,
  SESSION_TTL_MS,
  simulateTrainingShot,
  starsFor,
  TARGET_RINGS,
  TARGET_X_RANGE,
  TARGET_Y_RANGE,
  targetFromSeed,
  TRAINING_SHOTS,
  xpFor,
  zoneFor,
  type TrainingSessionState,
} from "@/lib/game/training";

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

const T = { x: 2, y: 1.2 };

describe("зона попадания", () => {
  it("по расстоянию от центра мишени", () => {
    expect(zoneFor({ x: 2, y: 1.2 }, T)).toBe("center");
    expect(zoneFor({ x: 2.3, y: 1.2 }, T)).toBe("middle");
    expect(zoneFor({ x: 2, y: 0.6 }, T)).toBe("outer");
    expect(zoneFor({ x: 1, y: 1.2 }, T)).toBe("miss");
  });

  it("граница кольца относится к кольцу", () => {
    expect(zoneFor({ x: T.x + TARGET_RINGS.center, y: T.y }, T)).toBe("center");
    expect(zoneFor({ x: T.x + TARGET_RINGS.center + 1e-6, y: T.y }, T)).toBe("middle");
    expect(zoneFor({ x: T.x, y: T.y + TARGET_RINGS.middle }, T)).toBe("middle");
    expect(zoneFor({ x: T.x - TARGET_RINGS.outer, y: T.y }, T)).toBe("outer");
    expect(zoneFor({ x: T.x - TARGET_RINGS.outer - 1e-6, y: T.y }, T)).toBe("miss");
  });

  it("мишень всегда сбоку от вратаря и в створе", () => {
    for (let s = 0; s < 2000; s++) {
      const t = targetFromSeed(s * 2654435761);
      expect(Math.abs(t.x)).toBeGreaterThanOrEqual(TARGET_X_RANGE[0]);
      expect(Math.abs(t.x)).toBeLessThanOrEqual(TARGET_X_RANGE[1]);
      expect(t.y).toBeGreaterThanOrEqual(TARGET_Y_RANGE[0]);
      expect(t.y).toBeLessThanOrEqual(TARGET_Y_RANGE[1]);
    }
    expect(targetFromSeed(42)).toEqual(targetFromSeed(42));
  });
});

describe("очки, звёзды, опыт", () => {
  it("очки по зонам: 100 / 60 / 30 / 0", () => {
    expect(pointsFor("center")).toBe(100);
    expect(pointsFor("middle")).toBe(60);
    expect(pointsFor("outer")).toBe(30);
    expect(pointsFor("miss")).toBe(0);
  });

  it("звёзды: пороги 150 / 300 / 420", () => {
    expect(starsFor(0)).toBe(0);
    expect(starsFor(149)).toBe(0);
    expect(starsFor(150)).toBe(1);
    expect(starsFor(299)).toBe(1);
    expect(starsFor(300)).toBe(2);
    expect(starsFor(419)).toBe(2);
    expect(starsFor(420)).toBe(3);
    expect(starsFor(500)).toBe(3);
  });

  it("опыт: round(score / 10) + 5·звёзды", () => {
    expect(xpFor(0, 0)).toBe(0);
    expect(xpFor(150, 1)).toBe(20);
    expect(xpFor(330, 2)).toBe(43);
    expect(xpFor(500, 3)).toBe(65);
    expect(xpFor(90, starsFor(90))).toBe(9);
    expect(xpFor(500, 3, false)).toBe(0);
  });
});

describe("удар по мишени", () => {
  const input: ShotInput = { kind: "straight", shape: 0, aimX: 0.55, aimY: 0.5, power: 0.7, curve: 0 };
  const plan = shotPlan(input, "penalty", PENALTY_SPOT);

  it("вратарь пассивный, монет нет", () => {
    const o = simulateTrainingShot(input, seeded(1), 1, T);
    expect(o.keeperPassive).toBe(true);
    expect(o.keeper.startMs).toBeGreaterThan(o.ball.flightMs);
    expect(o.coins).toBe(0);
    expect(o.points).toBe(pointsFor(o.zone));
  });

  it("мишень не влияет на полёт мяча — автонаведения нет", () => {
    const near = simulateTrainingShot(input, seeded(7), 10, { x: plan.x, y: plan.y });
    const far = simulateTrainingShot(input, seeded(7), 10, { x: -2.5, y: 0.6 });
    expect(near.ball).toEqual(far.ball);
  });

  it("точность сужает разброс вокруг точки прицела, а не смещает его", () => {
    const n = 4000;
    const stats = (level: number) => {
      let sx = 0;
      let sdev = 0;
      for (let i = 0; i < n; i++) {
        const o = simulateTrainingShot(input, seeded(1000 + i), level, T);
        sx += o.ball.x;
        sdev += Math.abs(o.ball.x - plan.x);
      }
      return { meanX: sx / n, meanDev: sdev / n };
    };
    const l1 = stats(1);
    const l10 = stats(10);
    // Центр разброса — прицел игрока на обоих уровнях.
    expect(l1.meanX).toBeCloseTo(plan.x, 1);
    expect(l10.meanX).toBeCloseTo(plan.x, 1);
    // Те же случайные числа → отклонение ровно ×0.775 (с точностью до округления до см).
    expect(l10.meanDev / l1.meanDev).toBeGreaterThan(0.76);
    expect(l10.meanDev / l1.meanDev).toBeLessThan(0.79);
  });

  it("на 1-м уровне мяч летит ровно как в пенальти без вратаря", () => {
    const o = simulateTrainingShot(input, () => 0.5, 1, T);
    // gaussian при u = v = 0.5 даёт детерминированное отклонение; сравниваем с планом напрямую.
    const g = Math.sqrt(-2 * Math.log(0.5)) * Math.cos(Math.PI);
    expect(o.ball.x).toBeCloseTo(plan.x + g * plan.spread, 2);
  });

  it("мимо створа и в каркас — промах, 0 очков", () => {
    const wide = simulateTrainingShot({ ...input, aimX: 1.5 }, seeded(3), 10, { x: 2.8, y: 1.2 });
    expect(wide.result).toBe("miss");
    expect(Math.abs(wide.ball.x)).toBeGreaterThan(GOAL_HALF_WIDTH);
    expect(wide.zone).toBe("miss");
    expect(wide.points).toBe(0);
    const high = simulateTrainingShot({ ...input, aimY: 1.5 }, seeded(3), 10, { x: 2, y: 1.7 });
    expect(high.ball.y).toBeGreaterThan(GOAL_HEIGHT);
    expect(high.points).toBe(0);
  });
});

describe("сессия", () => {
  const t0 = 1_000_000;
  const fresh = (): TrainingSessionState => ({ status: "active", shotsTaken: 0, score: 0, createdAt: t0, lastShotAt: null });
  const play = (points: number[]) =>
    points.reduce((s, p, i) => applyShot(s, p, t0 + (i + 1) * MIN_SHOT_INTERVAL_MS), fresh());

  it("пять ударов, шестой не принимается", () => {
    const s = play([100, 60, 30, 0, 100]);
    expect(s.shotsTaken).toBe(TRAINING_SHOTS);
    expect(s.score).toBe(290);
    expect(checkShot(s, t0 + 60_000)).toEqual({ ok: false, reason: "complete" });
    expect(() => applyShot(s, 100, t0 + 60_000)).toThrow(/complete/);
  });

  it("номер удара считает сессия, а не клиент", () => {
    expect(checkShot(fresh(), t0)).toEqual({ ok: true, shotNo: 1 });
    expect(checkShot(play([30, 30]), t0 + 60_000)).toEqual({ ok: true, shotNo: 3 });
  });

  it("слишком частые удары и просроченная сессия отклоняются", () => {
    const s = applyShot(fresh(), 30, t0);
    expect(checkShot(s, t0 + MIN_SHOT_INTERVAL_MS - 1)).toEqual({ ok: false, reason: "too-fast" });
    expect(checkShot(s, t0 + MIN_SHOT_INTERVAL_MS).ok).toBe(true);
    expect(checkShot(s, t0 + SESSION_TTL_MS + 1)).toEqual({ ok: false, reason: "expired" });
  });

  it("после пятого удара тренировка завершается с итогом", () => {
    const s = play([100, 100, 100, 60, 60]);
    const r = finishSession(s, 0);
    expect(r).toEqual({ ok: true, session: { ...s, status: "finished" }, stars: 3, rewarded: true, xp: 42 + 15 });
  });

  it("незавершённую тренировку закрыть нельзя", () => {
    expect(finishSession(play([100, 100, 100, 100]), 0)).toEqual({ ok: false, reason: "not-complete" });
  });

  it("повторное завершение не начисляет опыт второй раз", () => {
    const first = finishSession(play([100, 100, 100, 100, 100]), 0);
    expect(first.ok && first.xp).toBe(65);
    if (!first.ok) throw new Error("unreachable");
    expect(finishSession(first.session, 0)).toEqual({ ok: false, reason: "already-finished" });
    expect(finishSession({ ...first.session, status: "expired" }, 0)).toEqual({ ok: false, reason: "already-finished" });
    expect(checkShot(first.session, t0 + 60_000)).toEqual({ ok: false, reason: "not-active" });
  });

  it("дневной лимит: опыт дают первые 5 тренировок, дальше — 0, но играть можно", () => {
    expect(REWARDED_SESSIONS_PER_DAY).toBe(5);
    const s = play([100, 100, 100, 100, 100]);
    const xps = [0, 1, 2, 3, 4, 5, 6].map((done) => {
      const r = finishSession(s, done);
      if (!r.ok) throw new Error("unexpected");
      return { rewarded: r.rewarded, xp: r.xp };
    });
    expect(xps.slice(0, 5).every((x) => x.rewarded && x.xp === 65)).toBe(true);
    expect(xps.slice(5).every((x) => !x.rewarded && x.xp === 0)).toBe(true);
    expect(checkShot(fresh(), t0).ok).toBe(true); // новая тренировка после лимита доступна
  });

  it("счётчик оставшихся тренировок с наградой", () => {
    expect([0, 1, 4, 5, 9, -1].map(rewardedSessionsLeft)).toEqual([5, 4, 1, 0, 0, 5]);
  });
});
