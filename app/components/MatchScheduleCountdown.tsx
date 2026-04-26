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
          className="flex h-14 w-14 min-w-0 flex-col items-center justify-center rounded-lg bg-white/10 p-2 backdrop-blur-sm"
        >
          <span className="text-xl font-bold tabular-nums text-white">{c.value}</span>
          <span className="text-[10px] font-medium uppercase text-white/50">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
