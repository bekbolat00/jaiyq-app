"use client";

import { motion } from "framer-motion";
import type { LiveMatchStatsShape } from "@/lib/data/mock";

function StatRow({
  label,
  home,
  away,
  index,
}: {
  label: string;
  home: number;
  away: number;
  index: number;
}) {
  const total = home + away;
  const homeShare = total > 0 ? (home / total) * 100 : 0;
  const awayShare = total > 0 ? (away / total) * 100 : 0;
  const transition = { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] as const, delay: index * 0.04 };

  return (
    <li className="px-4 py-3.5">
      <div className="grid grid-cols-[48px_1fr_48px] items-center gap-2">
        <span className="t-h3 tabular-nums text-foreground">{home}</span>
        <span className="t-small text-center text-muted">{label}</span>
        <span className="t-h3 text-right tabular-nums text-foreground">{away}</span>
      </div>
      <div className="mt-2.5 flex h-1 w-full gap-1">
        <div className="flex h-full flex-1 justify-end overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${homeShare}%` }}
            transition={transition}
          />
        </div>
        <div className="flex h-full flex-1 justify-start overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className="h-full rounded-full bg-muted/40"
            initial={{ width: 0 }}
            animate={{ width: `${awayShare}%` }}
            transition={transition}
          />
        </div>
      </div>
    </li>
  );
}

type RowKey =
  | "possession"
  | "shots"
  | "shotsOnTarget"
  | "corners"
  | "offsides"
  | "saves"
  | "yellowCards";

type Props = {
  stats: LiveMatchStatsShape;
  className?: string;
  /** По умолчанию владение, удары, удары в створ, угловые. */
  rows?: RowKey[];
  /** Переименования метрик. */
  labelOverrides?: Partial<Record<RowKey, string>>;
};

const DEFAULT_LABELS: Record<RowKey, string> = {
  possession: "Владение мячом",
  shots: "Удары",
  shotsOnTarget: "Удары в створ",
  corners: "Угловые",
  offsides: "Офсайды",
  saves: "Сейвы",
  yellowCards: "Жёлтые карточки",
};

function pickPair(stats: LiveMatchStatsShape, key: RowKey): { home: number; away: number } {
  switch (key) {
    case "possession":
      return stats.possession;
    case "shots":
      return stats.shots;
    case "shotsOnTarget":
      return stats.shotsOnTarget;
    case "corners":
      return stats.corners;
    case "offsides":
      return stats.offsides;
    case "saves":
      return stats.saves;
    case "yellowCards":
      return stats.yellowCards;
    default:
      return { home: 0, away: 0 };
  }
}

export default function MatchSpartakStats({
  stats,
  className = "",
  rows = ["possession", "shots", "shotsOnTarget", "corners"],
  labelOverrides = {},
}: Props) {
  return (
    <ul className={`card divide-y divide-line overflow-hidden ${className}`}>
      {rows.map((key, index) => {
        const { home, away } = pickPair(stats, key);
        return (
          <StatRow
            key={key}
            label={labelOverrides[key] ?? DEFAULT_LABELS[key]}
            home={home}
            away={away}
            index={index}
          />
        );
      })}
    </ul>
  );
}
