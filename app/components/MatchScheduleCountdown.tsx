"use client";

import { useEffect, useState } from "react";

type Props = {
  /** ISO date string */
  target: string;
};

type Segments = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

function computeSegments(target: string): Segments {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, done: false };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/** Обратный отсчёт в стиле расписания: ДНИ · ЧАС · МИН · СЕК. */
export default function MatchScheduleCountdown({ target }: Props) {
  const [segments, setSegments] = useState<Segments>(() => computeSegments(target));

  useEffect(() => {
    const id = setInterval(() => {
      setSegments(computeSegments(target));
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (segments.done) {
    return (
      <div className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-accent">
        Скоро старт
      </div>
    );
  }

  const cells: { value: string; label: string }[] = [
    { value: pad(segments.days), label: "ДНИ" },
    { value: pad(segments.hours), label: "ЧАС" },
    { value: pad(segments.minutes), label: "МИН" },
    { value: pad(segments.seconds), label: "СЕК" },
  ];

  return (
    <div className="grid min-w-0 grid-cols-4 gap-1.5 sm:gap-2">
      {cells.map((c) => (
        <div
          key={c.label}
          className="flex flex-col items-center justify-center rounded-xl border border-white/[0.1] bg-black/30 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:py-2.5"
        >
          <span className="font-mono text-base font-black tabular-nums text-white sm:text-lg">
            {c.value}
          </span>
          <span className="mt-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-white/45 sm:text-[9px]">
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}
