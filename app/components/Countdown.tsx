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

export default function Countdown({ target }: Props) {
  const [segments, setSegments] = useState<Segments>(() => computeSegments(target));

  useEffect(() => {
    const id = setInterval(() => {
      setSegments(computeSegments(target));
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (segments.done) {
    return (
      <div className="neon-cyan flex items-center justify-center rounded-2xl border border-accent/35 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">
        Матч уже идёт — болеем за наших!
      </div>
    );
  }

  const cells: { value: string; label: string }[] = [
    { value: pad(segments.days), label: "дн" },
    { value: pad(segments.hours), label: "ч" },
    { value: pad(segments.minutes), label: "мин" },
    { value: pad(segments.seconds), label: "сек" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {cells.map((c) => (
        <div
          key={c.label}
          className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] py-2.5 backdrop-blur-xl"
        >
          <span className="font-mono text-xl font-semibold tabular-nums text-foreground">
            {c.value}
          </span>
          <span className="mt-0.5 text-[10px] uppercase tracking-widest text-muted">
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}
