"use client";

import { motion } from "framer-motion";
import type { LiveTimelineEvent } from "@/lib/data/mock";

function EventIcon({ type }: { type: LiveTimelineEvent["type"] }) {
  if (type === "goal") {
    return (
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-[20px] leading-none shadow-[0_0_20px_rgba(0,240,255,0.15)]"
        aria-hidden
      >
        ⚽
      </span>
    );
  }
  if (type === "yellow") {
    return (
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#fbbf24]/35 bg-[#fbbf24]/10 text-[18px] leading-none"
        aria-hidden
      >
        🟨
      </span>
    );
  }
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-[17px] leading-none"
      aria-hidden
    >
      🔄
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
      <div className={`relative ${heading ? "mt-4" : ""}`}>
        <div
          className="absolute bottom-2 left-1/2 top-2 z-0 w-px -translate-x-1/2 bg-gradient-to-b from-white/10 via-white/35 to-white/10"
          aria-hidden
        />
        <ul className="relative z-[1] space-y-0">
          {events.map((ev, i) => {
            const isHome = ev.side === "home";
            return (
              <li key={ev.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-1 gap-y-0 pb-6 last:pb-1">
                <div className="flex min-w-0 justify-end pr-1">
                  {isHome ? (
                    <motion.div
                      initial={{ opacity: 0, x: -28 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="max-w-[min(100%,11.5rem)] rounded-2xl border border-white/[0.1] bg-gradient-to-br from-white/[0.09] to-white/[0.02] px-2.5 py-2 text-right shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md"
                    >
                      <div className="flex items-center justify-end gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black tabular-nums text-accent">{ev.minute}&apos;</p>
                          <p className="mt-0.5 text-[11px] font-semibold leading-snug text-foreground/90 [text-wrap:balance]">
                            {ev.label}
                          </p>
                        </div>
                        <EventIcon type={ev.type} />
                      </div>
                    </motion.div>
                  ) : (
                    <span className="block h-px w-full max-w-[4rem] opacity-0" aria-hidden />
                  )}
                </div>

                <div className="flex w-11 shrink-0 flex-col items-center pt-0.5">
                  <span className="h-2 w-2 rounded-full border border-white/25 bg-[#020408] shadow-[0_0_0_3px_rgba(255,255,255,0.06)]" />
                </div>

                <div className="flex min-w-0 justify-start pl-1">
                  {!isHome ? (
                    <motion.div
                      initial={{ opacity: 0, x: 28 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="max-w-[min(100%,11.5rem)] rounded-2xl border border-accent/25 bg-gradient-to-bl from-accent/12 to-white/[0.03] px-2.5 py-2 text-left shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md"
                    >
                      <div className="flex items-center justify-start gap-2">
                        <EventIcon type={ev.type} />
                        <div className="min-w-0">
                          <p className="text-[10px] font-black tabular-nums text-accent">{ev.minute}&apos;</p>
                          <p className="mt-0.5 text-[11px] font-semibold leading-snug text-foreground/90 [text-wrap:balance]">
                            {ev.label}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <span className="block h-px w-full max-w-[4rem] opacity-0" aria-hidden />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
