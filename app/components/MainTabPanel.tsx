"use client";

import { useMemo } from "react";
import FinishedMatchResultCard from "@/app/components/FinishedMatchResultCard";
import NewsFeedPanel from "@/app/components/NewsFeedPanel";
import SectionHeader, { SectionAction } from "@/app/components/ui/SectionHeader";
import type { DbMatchRow } from "@/lib/types";

type Props = {
  onViewAllMatches: () => void;
  pastMatches: DbMatchRow[];
  onOpenMatchDetail?: (matchId: string) => void;
};

export default function MainTabPanel({ onViewAllMatches, pastMatches, onOpenMatchDetail }: Props) {
  const recent = useMemo(() => pastMatches.slice(0, 5), [pastMatches]);

  return (
    <div className="flex flex-col gap-8">
      {recent.length > 0 && (
        <section aria-label="Последние матчи">
          <SectionHeader
            title="Последние матчи"
            action={<SectionAction onClick={onViewAllMatches}>Все матчи</SectionAction>}
          />
          {/* Один список с разделителями вместо карусели карточек. */}
          <div className="card divide-y divide-line overflow-hidden" role="list">
            {recent.map((row, index) => (
              <FinishedMatchResultCard
                key={row.id}
                row={row}
                index={index}
                grouped
                onAboutMatch={onOpenMatchDetail ? () => onOpenMatchDetail(row.id) : undefined}
              />
            ))}
          </div>
        </section>
      )}

      <NewsFeedPanel />
    </div>
  );
}
