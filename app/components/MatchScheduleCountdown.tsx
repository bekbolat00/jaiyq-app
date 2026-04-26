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
      <div className="shrink-0 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-accent">
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
    <div className="flex items-center gap-1 shrink-0">
      {cells.map((c, i) => (
        <Fragment key={c.label}>
          {i > 0 ? (
            <span aria-hidden className="text-white/30 font-bold text-xs mb-3 px-0.5">
              :
            </span>
          ) : null}
          <div className="flex flex-col items-center justify-center w-[36px] h-[46px] bg-white/10 border border-white/5 rounded-md backdrop-blur-md">
            <span className="text-sm font-bold text-white">{c.value}</span>
            <span className="text-[7px] uppercase text-white/50 tracking-wider">{c.label}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
