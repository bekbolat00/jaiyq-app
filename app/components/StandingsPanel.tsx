"use client";

import { motion } from "framer-motion";
import { CircleAlert } from "lucide-react";
import Button from "@/app/components/ui/Button";
import Crest from "@/app/components/ui/Crest";
import EmptyState from "@/app/components/ui/EmptyState";
import { useStandings } from "@/app/hooks/useStandings";
import { ZHAIYQ_KFF_TEAM_ID } from "@/lib/kff/http";
import type { StandingsRow } from "@/lib/kff/standings";

const FORM_CLASS = { W: "bg-win", D: "bg-draw", L: "bg-loss" } as const;

function Row({ row, index }: { row: StandingsRow; index: number }) {
  const isZhaiyq = row.kffTeamId === ZHAIYQ_KFF_TEAM_ID;
  return (
    <motion.li
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.02 * index, duration: 0.2 }}
      className={`relative grid grid-cols-[1.75rem_1fr_2rem_2.25rem_2.25rem] items-center gap-2 border-b border-line px-3 py-3 last:border-0 ${
        isZhaiyq ? "bg-accent/[0.06]" : ""
      }`}
    >
      {isZhaiyq && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-accent" aria-hidden />}
      <span className={`t-small text-center tabular-nums ${isZhaiyq ? "font-semibold text-accent" : "text-muted"}`}>{row.place}</span>
      <span className="flex min-w-0 items-center gap-2.5">
        <Crest src={row.logoUrl} size={28} />
        <span className="min-w-0">
          <span className={`t-body block truncate ${isZhaiyq ? "font-semibold text-foreground" : "text-foreground/90"}`}>{row.name}</span>
          <span className="mt-0.5 flex gap-[3px]" aria-label={`Форма: ${row.form.join("")}`}>
            {row.form.slice(-5).map((f, i) => (
              <span key={i} className={`h-1 w-3 rounded-full ${FORM_CLASS[f]}`} />
            ))}
          </span>
        </span>
      </span>
      <span className="t-small text-center tabular-nums text-muted">{row.played}</span>
      <span className={`t-small text-center tabular-nums ${row.diff > 0 ? "text-win" : row.diff < 0 ? "text-loss" : "text-muted"}`}>
        {row.diff > 0 ? `+${row.diff}` : row.diff}
      </span>
      <span className={`t-body text-center font-semibold tabular-nums ${isZhaiyq ? "text-accent" : "text-foreground"}`}>{row.points}</span>
    </motion.li>
  );
}

/** Турнирная таблица Первой лиги — живые данные с kffleague.kz. */
export default function StandingsPanel() {
  const standings = useStandings();

  if (standings.status === "loading") {
    return (
      <div className="card overflow-hidden" aria-busy>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-line px-3 py-3 last:border-0">
            <span className="h-4 w-5 animate-pulse rounded bg-surface-2" />
            <span className="h-7 w-7 animate-pulse rounded-full bg-surface-2" />
            <span className="h-4 flex-1 animate-pulse rounded bg-surface-2" />
            <span className="h-4 w-7 animate-pulse rounded bg-surface-2" />
          </div>
        ))}
      </div>
    );
  }

  if (standings.status === "error") {
    return (
      <div className="card">
        <EmptyState
          icon={<CircleAlert className="h-6 w-6" strokeWidth={1.75} aria-hidden />}
          title="Таблица недоступна"
          description="Не удалось получить данные с kffleague.kz."
          action={<Button variant="secondary" size="sm" onClick={standings.retry}>Повторить</Button>}
        />
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="t-caption grid grid-cols-[1.75rem_1fr_2rem_2.25rem_2.25rem] items-center gap-2 border-b border-line px-3 py-2.5 text-subtle">
        <span className="text-center">#</span>
        <span>Команда</span>
        <span className="text-center">И</span>
        <span className="text-center">±</span>
        <span className="text-center">О</span>
      </div>
      <ul>
        {standings.data.rows.map((row, i) => (
          <Row key={row.kffTeamId} row={row} index={i} />
        ))}
      </ul>
      <p className="t-caption border-t border-line px-3 py-2 text-subtle">Данные kffleague.kz · обновляется каждые 10 минут</p>
    </div>
  );
}
