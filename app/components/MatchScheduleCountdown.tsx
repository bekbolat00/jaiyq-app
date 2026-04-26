"use client";

import { Fragment, useEffect, useState } from "react";

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
    <div className="flex min-w-0 flex-wrap items-end justify-center gap-0.5 sm:gap-1">
      {cells.map((c, i) => (
        <Fragment key={c.label}>
          {i > 0 ? (
            <span aria-hidden className="text-white/30 text-xl font-bold pb-4">
              :
            </span>
          ) : null}
          <div className="flex h-14 w-11 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg">
            <span className="text-xl font-black text-white tabular-nums">{c.value}</span>
            <span className="mt-0.5 text-[9px] uppercase tracking-widest text-white/50">
              {c.label}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
