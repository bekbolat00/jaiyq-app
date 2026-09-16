"use client";

import { useEffect, useState } from "react";
import { CircleAlert, Users } from "lucide-react";
import EmptyState from "@/app/components/ui/EmptyState";
import RosterPlayerCard from "@/app/components/RosterPlayerCard";
import { fetchZhaiyqRosterGroups, type RosterGroup, type RosterPlayer } from "@/lib/team/fetchTeamRoster";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

type Props = {
  onSelect?: (player: RosterPlayer) => void;
};

export default function TeamRosterGroups({ onSelect }: Props) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(
    configured ? null : "Supabase не настроен: проверьте .env",
  );
  const [groups, setGroups] = useState<RosterGroup[]>([]);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    void fetchZhaiyqRosterGroups().then((res) => {
      if (cancelled) return;
      setGroups(res.groups);
      setError(res.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [configured]);

  if (loading) {
    return (
      <div aria-busy className="flex flex-col gap-3">
        <span className="sr-only">Загружаем состав…</span>
        <div className="h-[26px] w-32 rounded-lg bg-surface" aria-hidden />
        <div className="grid grid-cols-2 gap-3" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="mt-6 aspect-[4/5] rounded-2xl border border-line bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  if (error && groups.length === 0) {
    return (
      <EmptyState
        icon={<CircleAlert className="h-6 w-6" strokeWidth={1.75} aria-hidden />}
        title="Не удалось загрузить состав"
        description={error}
      />
    );
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-6 w-6" strokeWidth={1.75} aria-hidden />}
        title="Состав пока не заполнен"
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`roster-${group.id}`}>
          <div className="mb-3 flex items-baseline gap-2">
            <h2 id={`roster-${group.id}`} className="t-h2 text-foreground">
              {group.label}
            </h2>
            <span className="t-small tabular-nums text-subtle">{group.players.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {group.players.map((p) => (
              <RosterPlayerCard key={p.id} player={p} onClick={onSelect} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
