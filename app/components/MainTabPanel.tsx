"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import FinishedMatchResultCard from "@/app/components/FinishedMatchResultCard";
import NewsFeedPanel from "@/app/components/NewsFeedPanel";
import type { DbMatchRow } from "@/lib/types";

type Props = {
  onViewAllMatches: () => void;
  pastMatches: DbMatchRow[];
  onOpenMatchDetail?: (matchId: string) => void;
};

export default function MainTabPanel({ onViewAllMatches, pastMatches, onOpenMatchDetail }: Props) {
  const homePast = useMemo(() => pastMatches.slice(0, 8), [pastMatches]);

  return (
    <div className="flex flex-col gap-8">
      {homePast.length > 0 ? (
        <section aria-label="Прошедшие матчи">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-white/50">
              ПРОШЕДШИЕ МАТЧИ
            </h2>
            <button
              type="button"
              onClick={onViewAllMatches}
              className="shrink-0 text-xs font-bold uppercase tracking-wider text-accent transition-opacity hover:opacity-90"
            >
              Все матчи &gt;
            </button>
          </div>
          <div className="flex snap-x gap-4 overflow-x-auto pb-4 [-webkit-overflow-scrolling:touch] hide-scrollbar">
            {homePast.map((row, index) => (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.05 * index,
                }}
                className="min-w-[280px] shrink-0 snap-center"
              >
                <FinishedMatchResultCard
                  row={row}
                  index={index}
                  onAboutMatch={
                    onOpenMatchDetail
                      ? () => onOpenMatchDetail(row.id)
                      : undefined
                  }
                />
              </motion.div>
            ))}
          </div>
        </section>
      ) : null}

      <NewsFeedPanel />
    </div>
  );
}
