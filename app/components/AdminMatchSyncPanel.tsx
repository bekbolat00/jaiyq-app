"use client";

import { useEffect, useState } from "react";
import { getTelegramInitData } from "@/lib/telegram/getInitData";
import type { SyncMatchesResult, SyncedGame } from "@/lib/kff/syncMatches";

type Phase = "idle" | "running" | "done" | "error";

const ACTION_LABEL: Record<SyncedGame["action"], string> = {
  created: "добавлен",
  updated: "обновлён",
  scraped: "составы и события",
  unchanged: "",
  failed: "ошибка",
};

/**
 * Ручная синхронизация матчей с kffleague.kz. Видна только админам
 * (ADMIN_TELEGRAM_IDS) — сервер всё равно перепроверяет права на каждом запросе.
 */
export default function AdminMatchSyncPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<SyncMatchesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initData = getTelegramInitData();
    if (!initData) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { isAdmin: boolean };
        if (!cancelled) setIsAdmin(data.isAdmin);
      } catch {
        /* не админ или нет сети — панель просто не показываем */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isAdmin) return null;

  const runSync = async () => {
    const initData = getTelegramInitData();
    if (!initData) return;
    setPhase("running");
    setError(null);
    try {
      const res = await fetch("/api/admin/sync-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(data as SyncMatchesResult);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить");
      setPhase("error");
    }
  };

  const changed = result?.games.filter((g) => g.action !== "unchanged") ?? [];

  return (
    <section className="space-y-3">
      <h2 className="px-1 text-[12px] font-bold uppercase tracking-widest text-muted">
        Администратор
      </h2>
      <div className="glass-premium space-y-3 rounded-3xl p-4">
        <div>
          <p className="text-[15px] font-semibold text-foreground">Матчи с kffleague.kz</p>
          <p className="mt-1 text-[12px] text-muted">
            Счёт, статус и даты всех игр сезона, а для недавно сыгранных — составы и события.
          </p>
        </div>

        <button
          type="button"
          onClick={runSync}
          disabled={phase === "running"}
          className="w-full rounded-2xl border border-accent/45 bg-accent/10 py-3 text-[13px] font-bold uppercase tracking-widest text-accent transition disabled:opacity-50"
        >
          {phase === "running" ? "Обновляю…" : "Обновить с KFF"}
        </button>

        {phase === "error" && error && (
          <p className="text-[12px] text-red-400">Ошибка: {error}</p>
        )}

        {phase === "done" && result && (
          <div className="space-y-2 text-[12px]">
            <p className="text-foreground/90">
              {changed.length
                ? `Изменений: ${changed.length}. Игроков в заявках: ${result.lineupsInserted}, событий: ${result.eventsInserted}.`
                : "Всё актуально — изменений нет."}
            </p>
            {changed.length > 0 && (
              <ul className="space-y-1">
                {changed.map((g) => (
                  <li
                    key={g.kffGameId}
                    className={g.action === "failed" ? "text-red-400" : "text-muted"}
                  >
                    {g.label} — {ACTION_LABEL[g.action]}
                    {g.error ? `: ${g.error}` : ""}
                  </li>
                ))}
              </ul>
            )}
            {result.warnings.length > 0 && (
              <details className="text-muted">
                <summary className="cursor-pointer">Предупреждения ({result.warnings.length})</summary>
                <ul className="mt-1 space-y-1">
                  {result.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
