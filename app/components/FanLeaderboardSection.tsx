"use client";

/* eslint-disable @next/next/no-img-element -- аватары из Telegram, next/image тут не нужен */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCw, Trophy } from "lucide-react";
import Button from "./ui/Button";
import EmptyState from "./ui/EmptyState";
import BrandWaves from "./ui/BrandWaves";
import SectionHeader, { SectionAction } from "./ui/SectionHeader";
import { SCORING_RULES } from "@/lib/fans/scoring";
import { getTelegramInitData } from "@/lib/telegram/getInitData";

type Row = {
  place: number;
  name: string;
  photoUrl: string | null;
  points: number;
  predictions: number;
  exact: number;
  isMe: boolean;
};

type Payload = {
  top: Row[];
  me: Row | null;
  ahead: { place: number; points: number } | null;
  totalFans: number;
  scoredMatches: number;
};

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; data: Payload; loggedIn: boolean };

const EASE = [0.2, 0.8, 0.2, 1] as const;

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

const pointsWord = (n: number) => plural(n, "очко", "очка", "очков");

function initials(name: string): string {
  const clean = name.replace(/^@/, "");
  return (
    clean
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "Б"
  );
}

function Avatar({ row, size, ringClass = "" }: { row: Row; size: number; ringClass?: string }) {
  const style = { width: size, height: size };
  const base = `shrink-0 rounded-full ${ringClass}`;
  if (row.photoUrl) {
    return (
      <img
        src={row.photoUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className={`${base} bg-surface-2 object-cover`}
        style={style}
      />
    );
  }
  return (
    <span
      className={`${base} flex items-center justify-center bg-surface-2 font-semibold text-muted`}
      style={{ ...style, fontSize: Math.max(12, Math.round(size * 0.34)) }}
      aria-hidden
    >
      {initials(row.name)}
    </span>
  );
}

export default function FanLeaderboardSection() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });
  const [rulesOpen, setRulesOpen] = useState(false);
  const router = useRouter();
  const goPredict = () => router.push("/");

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- перезапрос по кнопке «Повторить»
    setState({ status: "loading" });
    const initData = getTelegramInitData();
    fetch("/api/fans/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(initData ? { initData } : {}),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as Payload;
      })
      .then((data) => {
        if (!cancelled) setState({ status: "ok", data, loggedIn: Boolean(initData) });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const hasRows = state.status === "ok" && state.data.top.length > 0;

  return (
    <section>
      <SectionHeader
        title="Рейтинг болельщиков"
        action={
          hasRows ? (
            <SectionAction onClick={() => setRulesOpen((v) => !v)}>
              {rulesOpen ? "Скрыть" : "Правила"}
            </SectionAction>
          ) : undefined
        }
      />

      <AnimatePresence initial={false}>
        {rulesOpen && hasRows && (
          <motion.div
            key="rules"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="overflow-hidden"
          >
            <RulesCard className="mb-3" />
          </motion.div>
        )}
      </AnimatePresence>

      {state.status === "loading" && <LeaderboardSkeleton />}

      {state.status === "error" && (
        <div className="card">
          <EmptyState
            icon={<Trophy className="h-6 w-6" strokeWidth={1.75} />}
            title="Не удалось загрузить рейтинг"
            description="Проверь соединение и попробуй ещё раз"
            action={
              <Button
                variant="secondary"
                size="sm"
                icon={<RotateCw className="h-4 w-4" strokeWidth={1.75} />}
                onClick={() => setAttempt((a) => a + 1)}
              >
                Повторить
              </Button>
            }
          />
        </div>
      )}

      {state.status === "ok" && !hasRows && (
        <div className="card">
          <EmptyState
            icon={<Trophy className="h-6 w-6" strokeWidth={1.75} />}
            title="Рейтинг скоро появится"
            description="Очки начисляются после матчей, на которые болельщики сделали прогноз"
            action={
              <Button size="sm" onClick={goPredict}>
                Сделать прогноз
              </Button>
            }
          />
          <div className="border-t border-line">
            <RulesList />
          </div>
        </div>
      )}

      {state.status === "ok" && hasRows && (
        <div className="flex flex-col gap-3">
          {state.data.me ? (
            <MyPlaceCard me={state.data.me} ahead={state.data.ahead} />
          ) : state.loggedIn ? (
            <JoinCard onPredict={goPredict} />
          ) : null}
          {state.data.top.length >= 3 && <Podium rows={state.data.top.slice(0, 3)} />}
          <RankList rows={state.data.top.length >= 3 ? state.data.top.slice(3) : state.data.top} />
        </div>
      )}
    </section>
  );
}

function RulesList() {
  return (
    <ul className="divide-y divide-line">
      {SCORING_RULES.map((rule) => (
        <li key={rule.title} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="t-small text-muted">{rule.title}</span>
          <span
            className={`t-small font-semibold tabular-nums ${rule.points > 0 ? "text-foreground" : "text-subtle"}`}
          >
            {rule.points > 0 ? `+${rule.points}` : "0"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RulesCard({ className = "" }: { className?: string }) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      <p className="t-small px-4 pt-3 text-muted">Очки за прогноз счёта после завершения матча:</p>
      <RulesList />
    </div>
  );
}

function MyPlaceCard({ me, ahead }: { me: Row; ahead: Payload["ahead"] }) {
  const gap = ahead ? ahead.points - me.points : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="relative overflow-hidden rounded-2xl border border-line-strong p-4"
      style={{ background: "linear-gradient(165deg, var(--navy) 0%, #0b1a57 45%, var(--surface) 100%)" }}
    >
      <BrandWaves className="absolute inset-x-0 bottom-0 h-12 w-full" opacity={0.12} />
      <div className="relative flex items-end justify-between gap-4">
        <div>
          <p className="t-display tabular-nums text-accent">#{me.place}</p>
          <p className="t-small mt-1 text-muted">Твоё место</p>
        </div>
        <div className="text-right">
          <p className="t-h1 tabular-nums text-foreground">{me.points}</p>
          <p className="t-caption text-muted">{pointsWord(me.points)}</p>
        </div>
      </div>
      <div className="relative mt-3 border-t border-line pt-3">
        <p className="t-small tabular-nums text-muted">
          Прогнозов: {me.predictions} · Точных счётов: {me.exact}
        </p>
        {ahead && (
          <p className="t-small mt-0.5 tabular-nums text-muted">
            {gap > 0
              ? `До ${ahead.place}-го места — ${gap} ${pointsWord(gap)}`
              : `Столько же очков, как у ${ahead.place}-го места`}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function JoinCard({ onPredict }: { onPredict: () => void }) {
  return (
    <div className="card flex items-center justify-between gap-3 p-4">
      <p className="t-small text-muted">Сделай прогноз на ближайший матч, чтобы попасть в рейтинг</p>
      <Button variant="secondary" size="sm" className="shrink-0" onClick={onPredict}>
        Сделать прогноз
      </Button>
    </div>
  );
}

const PODIUM_STYLE: Record<1 | 2 | 3, { size: number; ring: string }> = {
  1: { size: 68, ring: "ring-2 ring-draw" },
  2: { size: 56, ring: "ring-2 ring-muted" },
  3: { size: 56, ring: "ring-2 ring-deep" },
};

function Podium({ rows }: { rows: Row[] }) {
  // Порядок колонок: 2-е, 1-е, 3-е.
  const columns = [
    { row: rows[1], slot: 2 as const, delay: 0 },
    { row: rows[0], slot: 1 as const, delay: 0.08 },
    { row: rows[2], slot: 3 as const, delay: 0.04 },
  ];
  return (
    <div className="card relative overflow-hidden px-2 pb-4 pt-5">
      <ol className="grid grid-cols-3 items-end gap-2">
        {columns.map(({ row, slot, delay }) => {
          const { size, ring } = PODIUM_STYLE[slot];
          return (
            <motion.li
              key={slot}
              initial={{ opacity: 0, y: 8, scale: slot === 1 ? 0.96 : 1 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22, ease: EASE, delay }}
              className={`flex min-w-0 flex-col items-center text-center ${slot === 1 ? "pb-2" : ""}`}
            >
              <span className="relative">
                <Avatar row={row} size={size} ringClass={`${ring} ring-offset-2 ring-offset-surface`} />
                <span
                  className="t-caption absolute -bottom-1.5 left-1/2 flex h-5 min-w-5 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-surface-2 px-1.5 tabular-nums text-foreground"
                  aria-label={`${row.place} место`}
                >
                  {row.place}
                </span>
              </span>
              <span
                className={`t-small mt-3 w-full truncate px-1 ${row.isMe ? "font-semibold text-accent" : "text-foreground"}`}
              >
                {row.name}
              </span>
              <span className="t-h3 tabular-nums text-foreground">{row.points}</span>
              <span className="t-caption text-subtle">{pointsWord(row.points)}</span>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

function RankList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <ol className="card divide-y divide-line overflow-hidden">
      {rows.map((row, i) => (
        <motion.li
          key={`${row.place}-${row.name}-${i}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: EASE, delay: Math.min(i, 5) * 0.04 }}
          className={`relative flex min-h-14 items-center gap-3 px-4 py-2.5 ${row.isMe ? "bg-accent/[0.06]" : ""}`}
        >
          {row.isMe && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-accent" aria-hidden />}
          <span
            className={`t-small w-6 shrink-0 text-center tabular-nums ${row.isMe ? "font-semibold text-accent" : "text-subtle"}`}
          >
            {row.place}
          </span>
          <Avatar row={row} size={32} />
          <span className={`t-body min-w-0 flex-1 truncate ${row.isMe ? "font-semibold text-foreground" : "text-foreground"}`}>
            {row.name}
          </span>
          <span className={`t-body font-semibold tabular-nums ${row.isMe ? "text-accent" : "text-foreground"}`}>
            {row.points}
          </span>
        </motion.li>
      ))}
    </ol>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Загрузка рейтинга">
      <div className="card grid grid-cols-3 items-end gap-2 px-2 pb-4 pt-5">
        {[56, 68, 56].map((size, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <span className="animate-pulse rounded-full bg-surface-2" style={{ width: size, height: size }} />
            <span className="h-3 w-14 animate-pulse rounded-lg bg-surface-2" />
            <span className="h-4 w-8 animate-pulse rounded-lg bg-surface-2" />
          </div>
        ))}
      </div>
      <div className="card divide-y divide-line overflow-hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
            <span className="h-3 w-6 animate-pulse rounded-lg bg-surface-2" />
            <span className="h-8 w-8 animate-pulse rounded-full bg-surface-2" />
            <span className="h-3 flex-1 animate-pulse rounded-lg bg-surface-2" />
            <span className="h-3 w-8 animate-pulse rounded-lg bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
