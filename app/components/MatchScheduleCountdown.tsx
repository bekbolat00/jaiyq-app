"use client";

import { useEffect, useState } from "react";

type Props = {
  /** ISO date string */
  target: string;
};

type Segments = { hours: number; minutes: number; seconds: number; done: boolean };

function computeSegments(target: string): Segments {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, done: true };
  return {
    hours: Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: false,
  };
}

const pad = (n: number) => n.toString().padStart(2, "0");

/**
 * Обратный отсчёт в день матча: «02:14:48» крупными цифрами и подписи под
 * ними. Дни не показываем — карточка переключается на таймер только за сутки.
 */
export default function MatchScheduleCountdown({ target }: Props) {
  const [s, setS] = useState<Segments>(() => computeSegments(target));

  useEffect(() => {
    const id = setInterval(() => setS(computeSegments(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (s.done) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="t-h2 text-foreground">Скоро старт</span>
        <span className="t-caption text-muted">ждём трансляцию</span>
      </div>
    );
  }

  const cells = [
    { v: pad(s.hours), l: "час" },
    { v: pad(s.minutes), l: "мин" },
    { v: pad(s.seconds), l: "сек" },
  ];

  return (
    <div className="flex items-start" aria-label={`До начала ${s.hours} ч ${s.minutes} мин`}>
      {cells.map((c, i) => (
        <div key={c.l} className="flex items-start">
          {i > 0 && <span className="t-h1 px-0.5 text-subtle">:</span>}
          <div className="flex w-[38px] flex-col items-center">
            <span className="t-h1 tabular-nums text-foreground">{c.v}</span>
            <span className="t-caption text-subtle">{c.l}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
