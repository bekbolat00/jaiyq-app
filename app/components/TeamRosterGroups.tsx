"use client";

import { useEffect, useState } from "react";
import RosterPlayerCard from "@/app/components/RosterPlayerCard";
import { fetchZhaiyqRosterGroups, type RosterGroup } from "@/lib/team/fetchTeamRoster";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export default function TeamRosterGroups() {
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
      <p className="py-12 text-center text-[12px] font-bold uppercase tracking-widest text-white/35">
        Загружаем состав…
      </p>
    );
  }

  if (error && groups.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] text-rose-300/90">{error}</p>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] text-white/40">
        Состав пока не заполнен
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.id}>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="neon-cyan shrink-0 text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
              {group.label}
            </h2>
            <span className="h-px flex-1 bg-white/10" aria-hidden />
            <span className="shrink-0 font-mono text-[11px] text-white/30">
              {group.players.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-12">
            {group.players.map((p) => (
              <RosterPlayerCard key={p.id} player={p} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
