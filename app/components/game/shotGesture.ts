/**
 * Жест удара «Забей гол»: форма свайпа → тип удара, конец свайпа → прицел.
 * Общий для матча (PenaltyGame) и тренировочного центра.
 */

import type { PenaltySceneHandle } from "@/app/components/game/PenaltyScene";
import { GOAL_HALF_WIDTH, GOAL_HEIGHT, type GameMode, type ShotInput, type ShotKind } from "@/lib/game/penalty";

export type SwipePoint = { x: number; y: number; t: number };

/**
 * Тип удара по форме жеста. Все пороги — в долях длины хорды начало→конец,
 * чтобы не зависеть от размера экрана.
 *  - зигзаг (≥2 смены стороны) — наклбол, размах — амплитуда;
 *  - палец поднялся и заметно опустился — парашют, высота дуги — насколько;
 *  - одна дуга в сторону — крученый, закрутка — куда и насколько выгнули;
 *  - иначе — прямой.
 */
export function classifySwipe(points: SwipePoint[]): { kind: ShotKind; curve: number; shape: number; peak: SwipePoint } | null {
  const a = points[0];
  const b = points[points.length - 1];
  const chord = Math.hypot(b.x - a.x, b.y - a.y);
  const peak = points.reduce((best, p) => (p.y < best.y ? p : best), a);
  const rise = a.y - peak.y; // на сколько палец вообще поднялся
  if (rise < 40 || chord < 24) return null;

  // Знаковое отклонение точек от хорды: слева/справа от прямой начало→конец.
  const dev = points.map((p) => ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / chord);
  const threshold = Math.max(6, chord * 0.06);
  let flips = 0;
  let side = 0;
  let firstSide = 0;
  let maxAbs = 0;
  let maxSigned = 0;
  for (const d of dev) {
    if (Math.abs(d) > Math.abs(maxSigned)) maxSigned = d;
    maxAbs = Math.max(maxAbs, Math.abs(d));
    if (Math.abs(d) < threshold) continue;
    const sgn = Math.sign(d);
    if (side && sgn !== side) flips++;
    if (!firstSide) firstSide = sgn;
    side = sgn;
  }

  const fall = b.y - peak.y; // на сколько опустился после пика
  if (flips >= 2) return { kind: "knuckle", curve: -firstSide, shape: Math.min(1, maxAbs / (chord * 0.25)), peak };
  if (fall > 40 && fall > rise * 0.25) return { kind: "lob", curve: 0, shape: Math.min(1, fall / (rise * 0.9)), peak };
  if (maxAbs > chord * 0.09) return { kind: "curl", curve: Math.max(-1, Math.min(1, -maxSigned / (chord * 0.28))), shape: 0, peak };
  return { kind: "straight", curve: 0, shape: 0, peak };
}

/**
 * Свайп прицела → параметры удара. Конец свайпа проецируется на плоскость ворот:
 * куда отпустил палец, туда (без разброса) прилетит мяч. Форма жеста задаёт тип
 * удара и его характер; сила уже поймана на шкале.
 */
export function swipeToAim(
  points: SwipePoint[],
  power: number,
  mode: GameMode,
  goalPointAt: PenaltySceneHandle["goalPointAt"],
): ShotInput | null {
  if (points.length < 2) return null;
  const gesture = classifySwipe(points);
  if (!gesture) return null;
  const b = points[points.length - 1];
  const target = goalPointAt(b.x, b.y);
  if (!target) return null;
  const { kind, curve, shape } = gesture;

  // Закрутка сносит мяч вбок (см. shotPlan) — прицел компенсирует снос, чтобы мяч пришёл под палец.
  const curveFactor = kind === "curl" ? 1 : kind === "lob" ? 0.4 : 0;
  const drift = curve * curveFactor * (mode === "freekick" ? 2.3 : 1.1) * 0.35;

  return {
    kind,
    shape,
    aimX: Math.max(-1.6, Math.min(1.6, (target.x - drift) / GOAL_HALF_WIDTH)),
    aimY: Math.max(0, Math.min(1.6, target.y / GOAL_HEIGHT)),
    power,
    curve,
  };
}
