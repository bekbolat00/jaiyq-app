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
    <div className="flex items-center gap-1.5">
      {cells.map((c, i) => (
        <Fragment key={c.label}>
          {i > 0 ? (
            <span aria-hidden className="text-white/30 font-bold mb-2 text-lg">
              :
            </span>
          ) : null}
          <div className="flex flex-col items-center justify-center w-10 h-12 bg-white/10 border border-white/5 rounded-lg backdrop-blur-md">
            <span className="text-lg font-bold text-white">{c.value}</span>
            <span className="text-[8px] uppercase text-white/50">{c.label}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
