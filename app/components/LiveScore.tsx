"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { LiveGameState, LiveGoal } from "@/lib/kff/liveGame";

/** Счёт и минута идущего (или только что завершившегося) матча вместо обратного отсчёта. */
export function LiveScoreCenter({ live }: { live: LiveGameState }) {
  const isLive = live.phase === "live";
  const hasPenalties = live.homePenaltyScore != null && live.awayPenaltyScore != null;

  return (
    <div className="flex shrink-0 flex-col items-center gap-1" aria-live="polite">
      {isLive ? (
        <span className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-red-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
          </span>
          {live.clockLabel}
        </span>
      ) : (
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white/60">
          Матч завершён
        </span>
      )}

      <div className="flex items-center gap-2 font-mono text-[32px] font-black leading-none tabular-nums text-white">
        <ScoreDigit value={live.homeScore} />
        <span className="text-white/30">:</span>
        <ScoreDigit value={live.awayScore} />
      </div>

      {hasPenalties && (
        <span className="text-[10px] font-bold text-white/50">
          пен. {live.homePenaltyScore}:{live.awayPenaltyScore}
        </span>
      )}
    </div>
  );
}

/** Цифра счёта, которая «подпрыгивает» при голе. */
function ScoreDigit({ value }: { value: number | null }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value ?? "-"}
        initial={{ y: -14, opacity: 0, scale: 1.3 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 14, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="inline-block"
      >
        {value ?? 0}
      </motion.span>
    </AnimatePresence>
  );
}

/** KFF отдаёт «Имя Фамилия» — в строке гола, как принято, только фамилия. */
function surname(fullName: string): string {
  return fullName.trim().split(/\s+/).pop() ?? fullName;
}

function GoalLine({ goal, align }: { goal: LiveGoal; align: "left" | "right" }) {
  return (
    <li className={`truncate ${align === "right" ? "text-right" : "text-left"}`}>
      <span className="font-mono text-white/50">{goal.minute}&apos;</span>{" "}
      <span className="text-white/80">{surname(goal.playerName)}</span>
      {goal.ownGoal && <span className="text-white/40"> (авт.)</span>}
    </li>
  );
}

/** Авторы голов под логотипами: хозяева слева, гости справа. */
export function LiveGoals({ live }: { live: LiveGameState }) {
  if (!live.goals.length) return null;
  const home = live.goals.filter((g) => g.side === "home");
  const away = live.goals.filter((g) => g.side === "away");
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 px-2 text-[11px]">
      <ul className="min-w-0 space-y-0.5">
        {home.map((g) => (
          <GoalLine key={g.id} goal={g} align="left" />
        ))}
      </ul>
      <ul className="min-w-0 space-y-0.5">
        {away.map((g) => (
          <GoalLine key={g.id} goal={g} align="right" />
        ))}
      </ul>
    </div>
  );
}
