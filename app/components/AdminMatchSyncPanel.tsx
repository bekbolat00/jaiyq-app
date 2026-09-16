"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import Button from "@/app/components/ui/Button";
import SectionHeader from "@/app/components/ui/SectionHeader";
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
    <section>
      <SectionHeader title="Администратор" />
      <div className="card p-4">
        <p className="t-h3 text-foreground">Матчи с kffleague.kz</p>
        <p className="t-small mt-1 text-muted">
          Счёт, статус и даты всех игр сезона, а для недавно сыгранных — составы и события.
        </p>

        <Button
          variant="secondary"
          size="md"
          fullWidth
          className="mt-4"
          loading={phase === "running"}
          icon={<RefreshCw className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />}
          onClick={runSync}
        >
          Обновить с KFF
        </Button>

        {phase === "error" && error && (
          <p className="t-small mt-3 text-loss" role="alert">
            Ошибка: {error}
          </p>
        )}

        {phase === "done" && result && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="t-small text-foreground">
              {changed.length
                ? `Изменений: ${changed.length}. Игроков в заявках: ${result.lineupsInserted}, событий: ${result.eventsInserted}.`
                : "Всё актуально — изменений нет."}
            </p>
            {changed.length > 0 && (
              <ul className="mt-2 divide-y divide-line">
                {changed.map((g) => (
                  <li
                    key={g.kffGameId}
                    className={`t-small py-2 ${g.action === "failed" ? "text-loss" : "text-muted"}`}
                  >
                    {g.label} — {ACTION_LABEL[g.action]}
                    {g.error ? `: ${g.error}` : ""}
                  </li>
                ))}
              </ul>
            )}
            {result.warnings.length > 0 && (
              <details className="t-small mt-2 text-muted">
                <summary className="cursor-pointer py-1">
                  Предупреждения ({result.warnings.length})
                </summary>
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
