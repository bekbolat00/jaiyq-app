"use client";

import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { splitUpcomingAndPast } from "@/lib/matches/splitMatches";
import type { DbMatchRow } from "@/lib/types";

export type UseAppMatchesResult = {
  loading: boolean;
  error: string | null;
  upcomingMatches: DbMatchRow[];
  pastMatches: DbMatchRow[];
  refetch: () => Promise<void>;
};

export function useAppMatches(): UseAppMatchesResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<DbMatchRow[]>([]);
  const [pastMatches, setPastMatches] = useState<DbMatchRow[]>([]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      setUpcomingMatches([]);
      setPastMatches([]);
      setError("Не заданы переменные Supabase");
      setLoading(false);
      return;
    }

    const { data, error: qErr } = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: true });

    if (qErr) {
      setUpcomingMatches([]);
      setPastMatches([]);
      setError(qErr.message || "Не удалось загрузить матчи");
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as DbMatchRow[];
    const { upcomingMatches: u, pastMatches: p } = splitUpcomingAndPast(rows);
    setUpcomingMatches(u);
    setPastMatches(p);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void refetch();
  }, [refetch]);

  // Telegram держит мини-аппку в памяти: без этого болельщик, свернувший
  // приложение до финального свистка, увидит старый счёт при возврате.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refetch]);

  return { loading, error, upcomingMatches, pastMatches, refetch };
}
