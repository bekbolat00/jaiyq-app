"use client";

import { motion } from "framer-motion";
import type { LiveTimelineEvent } from "@/lib/data/mock";

function EventIcon({ type }: { type: LiveTimelineEvent["type"] }) {
  if (type === "goal") {
    return (
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-[17px] leading-none shadow-[0_0_20px_rgba(0,240,255,0.15)]"
        aria-hidden
      >
        ⚽
      </span>
    );
  }
  if (type === "red") {
    return (
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rose-500/40 bg-rose-500/10 text-[15px] leading-none"
        aria-hidden
      >
        🟥
      </span>
    );
  }
  if (type === "yellow") {
    return (
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#fbbf24]/35 bg-[#fbbf24]/10 text-[15px] leading-none"
        aria-hidden
      >
        🟨
      </span>
    );
  }
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-[15px] leading-none"
      aria-hidden
    >
      🔄
    </span>
  );
}

function eventKindLabel(type: LiveTimelineEvent["type"]): string {
  if (type === "yellow") return "Жёлтая карточка";
  if (type === "red") return "Красная карточка";
  if (type === "sub") return "Замена";
  return "";
}

function EventCard({
  ev,
  align,
}: {
  ev: LiveTimelineEvent;
  align: "left" | "right";
}) {
  const isRight = align === "right";

  const body =
    ev.type === "goal" ? (
      <div className={isRight ? "text-left" : "text-right"}>
        <p className="text-[12px] font-black leading-snug text-foreground [text-wrap:balance]">
          {ev.scoreAfter ? `${ev.scoreAfter.home}:${ev.scoreAfter.away}` : ""}{" "}
          <span className="text-foreground/90">{ev.playerName ?? ev.label}</span>{" "}
          <span className="text-emerald-400">ГОЛ!</span>
        </p>
        {ev.isPenalty ? (
          <p className="mt-0.5 text-[10px] text-muted">Пенальти</p>
        ) : null}
        {ev.videoUrl ? (
          <a
            href={ev.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-1.5 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-foreground/85 ${isRight ? "" : "flex-row-reverse"}`}
          >
            <span aria-hidden>▶</span> Смотреть гол
          </a>
        ) : null}
      </div>
    ) : ev.type === "sub" ? (
      <div className={isRight ? "text-left" : "text-right"}>
        <p className="text-[11px] font-bold leading-snug text-foreground/90">
          {ev.playerName ?? ev.label}
        </p>
        {ev.playerOutName ? (
          <p className="mt-0.5 text-[10px] text-muted">{ev.playerOutName}</p>
        ) : null}
        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted/70">
          Замена
        </p>
      </div>
    ) : (
      <div className={isRight ? "text-left" : "text-right"}>
        <p className="text-[11px] font-bold leading-snug text-foreground/90">
          {ev.playerName ?? ev.label}
        </p>
        <p className="mt-0.5 text-[10px] text-muted">{eventKindLabel(ev.type)}</p>
      </div>
    );

  return (
    <motion.div
      initial={{ opacity: 0, x: isRight ? 28 : -28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`max-w-[min(100%,12.5rem)] rounded-2xl border px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md ${
        isRight
          ? "border-accent/25 bg-gradient-to-bl from-accent/12 to-white/[0.03]"
          : "border-white/[0.1] bg-gradient-to-br from-white/[0.09] to-white/[0.02]"
      }`}
    >
      <div className={`flex items-center gap-2 ${isRight ? "flex-row" : "flex-row-reverse"}`}>
        <div className="min-w-0 flex-1">{body}</div>
        <EventIcon type={ev.type} />
      </div>
    </motion.div>
  );
}

function HalfMarker({
  label,
  score,
}: {
  label: string;
  score: { home: number; away: number };
}) {
  return (
    <li className="flex justify-center py-2">
      <span className="rounded-full border border-white/15 bg-[#020408] px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/70 shadow-[0_0_0_4px_rgba(2,4,8,1)]">
        {label}{" "}
        <span className="font-mono text-accent">
          {score.home}:{score.away}
        </span>
      </span>
    </li>
  );
}

type Props = {
  events: LiveTimelineEvent[];
  finalScore?: { home: number; away: number };
  htScore?: { home: number; away: number };
  className?: string;
  heading?: string;
};

export default function MatchTimeline({
  events,
  finalScore,
  htScore,
  className = "",
  heading = "Таймлайн",
}: Props) {
  return (
    <div className={className}>
      {heading ? (
        <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{heading}</h4>
      ) : null}
      <div className={`relative ${heading ? "mt-4" : ""}`}>
        <div
          className="absolute bottom-2 left-1/2 top-2 z-0 w-px -translate-x-1/2 bg-gradient-to-b from-white/10 via-white/35 to-white/10"
          aria-hidden
        />
        <ul className="relative z-[1] space-y-0">
          {htScore ? <HalfMarker label="1-Й ТАЙМ" score={htScore} /> : null}
          {events.map((ev) => {
            const isHome = ev.side === "home";
            return (
              <li
                key={ev.id}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-1 gap-y-0 pb-6 last:pb-1"
              >
                <div className="flex min-w-0 justify-end pr-1">
                  {isHome ? (
                    <EventCard ev={ev} align="left" />
                  ) : (
                    <span className="block h-px w-full max-w-[4rem] opacity-0" aria-hidden />
                  )}
                </div>

                <div className="flex w-11 shrink-0 flex-col items-center gap-1 pt-0.5">
                  <span className="h-2 w-2 rounded-full border border-white/25 bg-[#020408] shadow-[0_0_0_3px_rgba(255,255,255,0.06)]" />
                  <span className="font-mono text-[9px] font-bold tabular-nums text-accent">
                    {ev.minute}&apos;
                  </span>
                </div>

                <div className="flex min-w-0 justify-start pl-1">
                  {!isHome ? (
                    <EventCard ev={ev} align="right" />
                  ) : (
                    <span className="block h-px w-full max-w-[4rem] opacity-0" aria-hidden />
                  )}
                </div>
              </li>
            );
          })}
          {finalScore ? <HalfMarker label="2-Й ТАЙМ" score={finalScore} /> : null}
        </ul>
      </div>
    </div>
  );
}
