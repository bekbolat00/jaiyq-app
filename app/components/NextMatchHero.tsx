"use client";

import UpcomingMatchScheduleCard from "@/app/components/UpcomingMatchScheduleCard";
import type { DbMatchRow } from "@/lib/types";

type Props = {
  match: DbMatchRow | null;
  loading: boolean;
  onExpertClick: (row: DbMatchRow) => void;
  onLiveFinished?: () => void;
};

/** Ближайший матч — главный блок главного экрана. */
export default function NextMatchHero({ match, loading, onExpertClick, onLiveFinished }: Props) {
  if (loading) {
    return (
      <div
        className="h-[318px] animate-pulse rounded-3xl border border-line bg-surface"
        aria-busy
        aria-label="Загрузка ближайшего матча"
      />
    );
  }

  if (!match) return null;

  return (
    <UpcomingMatchScheduleCard
      variant="hero"
      row={match}
      onExpertClick={() => onExpertClick(match)}
      onLiveFinished={onLiveFinished}
    />
  );
}
