"use client";

import { motion } from "framer-motion";
import type { LiveTimelineEvent } from "@/lib/data/mock";

function TimelineIcon({ type }: { type: LiveTimelineEvent["type"] }) {
  if (type === "goal") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/15 text-accent neon-cyan">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.35" />
          <path
            d="M12 5.5v13M7.2 8.2l9.6 7.6M7.2 15.8l9.6-7.6"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            opacity={0.85}
          />
        </svg>
      </span>
    );
  }
  if (type === "yellow") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#fbbf24]/50 bg-[#fbbf24]/20">
        <span className="h-5 w-3.5 rounded-[2px] bg-[#facc15] shadow-[0_0_12px_rgba(250,204,21,0.55)]" />
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-foreground">
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden
      >
        <path d="M7 7h6v6H7zM11 11h6v6h-6z" strokeLinejoin="round" />
        <path d="M9 9l6 6M15 9 9 15" strokeLinecap="round" opacity={0.35} />
      </svg>
    </span>
  );
}

type Props = {
  events: LiveTimelineEvent[];
  className?: string;
  heading?: string;
};

export default function MatchTimeline({
  events,
  className = "",
  heading = "Таймлайн",
}: Props) {
  return (
    <div className={className}>
      {heading ? (
        <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{heading}</h4>
      ) : null}
      <ul className={`space-y-0 ${heading ? "mt-4" : ""}`}>
        {events.map((ev, i) => (
          <motion.li
            key={ev.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.06 * i, duration: 0.35 }}
            className="flex gap-3 pb-5 last:pb-0"
          >
            <div className="flex w-9 shrink-0 flex-col items-center">
              <TimelineIcon type={ev.type} />
              {i < events.length - 1 ? (
                <div
                  className="mt-2 min-h-[28px] w-px flex-1 bg-gradient-to-b from-white/35 to-white/5"
                  aria-hidden
                />
              ) : null}
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[12px] font-bold tabular-nums text-accent">{ev.minute}&apos;</p>
              <p className="mt-0.5 text-[13px] leading-snug text-foreground/90">{ev.label}</p>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
