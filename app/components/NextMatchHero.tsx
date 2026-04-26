"use client";

import UpcomingMatchScheduleCard from "@/app/components/UpcomingMatchScheduleCard";
import type { DbMatchRow } from "@/lib/types";

type Props = {
  match: DbMatchRow | null;
  loading: boolean;
  onExpertClick: (row: DbMatchRow) => void;
};

/** Один ближайший предстоящий матч — между баннером «Матч тура» и табами главной. */
export default function NextMatchHero({ match, loading, onExpertClick }: Props) {
  if (loading) {
    return (
      <div className="-mx-4 px-4" aria-busy aria-label="Загрузка ближайшего матча">
        <div className="h-[200px] animate-pulse rounded-2xl border border-white/[0.07] bg-white/[0.04]" />
      </div>
    );
  }

  if (!match) {
    return null;
  }

  return (
    <div className="-mx-4 px-4">
      <UpcomingMatchScheduleCard row={match} onExpertClick={() => onExpertClick(match)} />
    </div>
  );
}
