"use client";

import { displayCase } from "@/lib/text/displayCase";
import { motion } from "framer-motion";
import { ArrowLeftRight, Goal, Play } from "lucide-react";
import type { ReactNode } from "react";
import type { LiveTimelineEvent } from "@/lib/data/mock";

function EventIcon({ type }: { type: LiveTimelineEvent["type"] }) {
  if (type === "goal") {
    return <Goal className="h-[18px] w-[18px] text-accent" strokeWidth={1.75} aria-hidden />;
  }
  if (type === "yellow" || type === "red") {
    return (
      <span
        className={`block h-[14px] w-[10px] rounded-[2px] ${type === "red" ? "bg-loss" : "bg-draw"}`}
        aria-hidden
      />
    );
  }
  return <ArrowLeftRight className="h-[18px] w-[18px] text-muted" strokeWidth={1.75} aria-hidden />;
}

function secondaryText(ev: LiveTimelineEvent): string | null {
  if (ev.type === "goal") {
    if (ev.isOwnGoal) return "Автогол";
    if (ev.isPenalty) return "Пенальти";
    return null;
  }
  if (ev.type === "yellow") return "Жёлтая карточка";
  if (ev.type === "red") return "Красная карточка";
  return ev.playerOutName ? `Замена · вместо ${displayCase(ev.playerOutName)}` : "Замена";
}

function EventBody({ ev, align }: { ev: LiveTimelineEvent; align: "left" | "right" }) {
  const isRight = align === "right";
  const secondary = secondaryText(ev);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      className={`flex min-w-0 items-start gap-2.5 ${isRight ? "flex-row" : "flex-row-reverse"}`}
    >
      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <EventIcon type={ev.type} />
      </span>
      <div className={`min-w-0 ${isRight ? "text-left" : "text-right"}`}>
        <div className={`flex flex-wrap items-center gap-1.5 ${isRight ? "" : "flex-row-reverse"}`}>
          {ev.type === "goal" && ev.scoreAfter ? (
            <span className="t-caption rounded-md bg-surface-2 px-1.5 py-0.5 tabular-nums text-foreground">
              {ev.scoreAfter.home}:{ev.scoreAfter.away}
            </span>
          ) : null}
          <span className="t-small font-medium text-foreground [overflow-wrap:anywhere]">
            {displayCase(ev.playerName ?? ev.label)}
          </span>
        </div>
        {secondary ? <p className="t-caption mt-0.5 text-muted">{secondary}</p> : null}
        {ev.type === "goal" && ev.videoUrl ? (
          <a
            href={ev.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`t-caption mt-1 inline-flex items-center gap-1 text-accent ${isRight ? "" : "flex-row-reverse"}`}
          >
            <Play className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            Смотреть гол
          </a>
        ) : null}
      </div>
    </motion.div>
  );
}

function Divider({ children }: { children: ReactNode }) {
  return (
    <li className="relative flex justify-center py-3">
      <span className="t-caption rounded-md bg-surface px-3 tabular-nums text-muted">{children}</span>
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

/**
 * Хроника матча: вертикальная ось по центру, события хозяев слева, гостей —
 * справа. Фон минуты и разделителей — `bg-surface`: компонент рассчитан на
 * размещение внутри карточки.
 */
export default function MatchTimeline({
  events,
  finalScore,
  htScore,
  className = "",
  heading = "Хроника",
}: Props) {
  // Перерыв ставим между событиями первого и второго тайма (события отсортированы по минуте).
  const firstSecondHalf = events.findIndex((ev) => ev.minute > 45);
  const breakIndex = htScore ? (firstSecondHalf === -1 ? events.length : firstSecondHalf) : -1;
  const breakRow = htScore ? (
    <Divider key="ht">
      Перерыв · {htScore.home}:{htScore.away}
    </Divider>
  ) : null;

  const rows: ReactNode[] = [];
  events.forEach((ev, i) => {
    if (i === breakIndex) rows.push(breakRow);
    const isHome = ev.side === "home";
    rows.push(
      <li key={ev.id} className="grid grid-cols-[1fr_44px_1fr] items-start py-2.5">
        <div className="flex min-w-0 justify-end">
          {isHome ? <EventBody ev={ev} align="left" /> : null}
        </div>
        <div className="flex justify-center">
          <span className="t-caption rounded-md bg-surface px-1 py-px tabular-nums text-subtle">
            {ev.minute}&apos;
          </span>
        </div>
        <div className="flex min-w-0 justify-start">
          {!isHome ? <EventBody ev={ev} align="right" /> : null}
        </div>
      </li>,
    );
  });
  if (breakIndex === events.length) rows.push(breakRow);

  return (
    <div className={className}>
      {heading ? <h3 className="t-h3 mb-3 text-foreground">{heading}</h3> : null}
      <div className="relative">
        <div className="absolute bottom-3 left-1/2 top-3 w-px -translate-x-1/2 bg-line" aria-hidden />
        <ul className="relative">
          {rows}
          {finalScore ? (
            <Divider>
              Итог · {finalScore.home}:{finalScore.away}
            </Divider>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
