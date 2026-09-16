"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LiveBadge } from "@/app/components/ui/Badges";
import type { LiveGameState, LiveGoal } from "@/lib/kff/liveGame";

/** Счёт и минута идущего (или только что завершившегося) матча вместо обратного отсчёта. */
export function LiveScoreCenter({ live }: { live: LiveGameState }) {
  const isLive = live.phase === "live";
  const hasPenalties = live.homePenaltyScore != null && live.awayPenaltyScore != null;

  return (
    <div className="flex shrink-0 flex-col items-center gap-2" aria-live="polite">
      {isLive ? (
        <LiveBadge label={live.clockLabel ?? "LIVE"} />
      ) : (
        <span className="t-caption rounded-lg bg-white/[0.08] px-2 py-1 text-muted">Матч завершён</span>
      )}

      <div className="t-display flex items-center gap-2 text-foreground">
        <ScoreDigit value={live.homeScore} />
        <span className="text-subtle">:</span>
        <ScoreDigit value={live.awayScore} />
      </div>

      {hasPenalties && (
        <span className="t-caption text-muted">
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
        initial={{ y: -14, opacity: 0, scale: 1.25 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 14, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
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
    <li className={`t-caption truncate ${align === "right" ? "text-right" : "text-left"}`}>
      <span className="tabular-nums text-subtle">{goal.minute}&apos;</span>{" "}
      <span className="text-foreground/85">{surname(goal.playerName)}</span>
      {goal.ownGoal && <span className="text-subtle"> (авт.)</span>}
    </li>
  );
}

/** Авторы голов под логотипами: хозяева слева, гости справа. */
export function LiveGoals({ live }: { live: LiveGameState }) {
  if (!live.goals.length) return null;
  const home = live.goals.filter((g) => g.side === "home");
  const away = live.goals.filter((g) => g.side === "away");
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/[0.08] px-1 pt-3">
      <ul className="min-w-0 space-y-1">
        {home.map((g) => (
          <GoalLine key={g.id} goal={g} align="left" />
        ))}
      </ul>
      <ul className="min-w-0 space-y-1">
        {away.map((g) => (
          <GoalLine key={g.id} goal={g} align="right" />
        ))}
      </ul>
    </div>
  );
}
