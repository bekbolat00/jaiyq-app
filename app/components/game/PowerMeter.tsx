"use client";

import { useEffect, useRef } from "react";
import { POWER_SWEET_MAX, POWER_SWEET_MIN } from "@/lib/game/penalty";
import { haptic } from "@/lib/telegram/webApp";

/** За сколько шкала проходит от 0 до 100%; потом столько же обратно — и так по кругу, как в FIFA. */
export const POWER_FILL_MS = 1100;

/** Положение пульсирующей шкалы: 0 → 1 → 0 → … Нажатие ловит текущее значение. */
export function powerAt(runningSince: number, now: number) {
  const phase = (Math.max(0, now - runningSince) % (POWER_FILL_MS * 2)) / POWER_FILL_MS;
  return phase <= 1 ? phase : 2 - phase;
}

/**
 * Вертикальная шкала силы: серая зона недобора, голубая рабочая, красная — перебор.
 * Пока шкала бегает, заливка обновляется каждый кадр напрямую в DOM, без ререндера игры.
 */
export default function PowerMeter({ runningSince, locked }: { runningSince: number | null; locked: number | null }) {
  const fill = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const paint = (v: number) => {
      if (fill.current) fill.current.style.clipPath = `inset(${(1 - v) * 100}% 0 0 0)`;
      if (label.current) label.current.textContent = `${Math.round(v * 100)}%`;
    };
    if (runningSince == null) {
      paint(locked ?? 0);
      return;
    }
    let raf = 0;
    let prev = 0;
    const tick = () => {
      const v = powerAt(runningSince, performance.now());
      // Лёгкий щелчок на границах рабочей зоны — в обе стороны.
      const crossed = (a: number) => (prev - a) * (v - a) < 0;
      if (crossed(POWER_SWEET_MIN) || crossed(POWER_SWEET_MAX)) haptic.select();
      prev = v;
      paint(v);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [runningSince, locked]);

  const zone = (from: number, to: number) => ({ bottom: `${from * 100}%`, height: `${(to - from) * 100}%` });

  return (
    <div className="pointer-events-none flex flex-col items-center gap-2" aria-hidden>
      <span ref={label} className="t-caption min-w-10 text-center font-semibold tabular-nums text-foreground">
        0%
      </span>
      <div className="relative h-[34dvh] w-4 overflow-hidden rounded-full bg-background/70 ring-1 ring-foreground/15 backdrop-blur">
        {/* Разметка зон под заливкой. */}
        <div className="absolute inset-x-0 bg-foreground/5" style={zone(0, POWER_SWEET_MIN)} />
        <div className="absolute inset-x-0 bg-accent/15" style={zone(POWER_SWEET_MIN, POWER_SWEET_MAX)} />
        <div className="absolute inset-x-0 bg-loss/25" style={zone(POWER_SWEET_MAX, 1)} />
        <div
          ref={fill}
          className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-accent to-loss"
          style={{ clipPath: "inset(100% 0 0 0)" }}
        />
        {[POWER_SWEET_MIN, POWER_SWEET_MAX].map((z) => (
          <div key={z} className="absolute inset-x-0 h-px bg-foreground/70" style={{ bottom: `${z * 100}%` }} />
        ))}
      </div>
    </div>
  );
}
