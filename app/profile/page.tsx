"use client";

import { useMemo, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import DigitalTicket from "../components/DigitalTicket";
import ToggleSwitch from "../components/ToggleSwitch";
import { CURRENT_USER, TICKETS } from "@/lib/data/mock";

type Filter = "active" | "archived";

type Rank = {
  id: string;
  title: string;
  minMatches: number;
};

const RANKS: Rank[] = [
  { id: "rookie", title: "Новичок", minMatches: 0 },
  { id: "fan", title: "Фанат", minMatches: 1 },
  { id: "legend", title: "Легенда", minMatches: 5 },
];

type Achievement = {
  id: string;
  title: string;
  icon: string;
  earned: boolean;
};

const ACHIEVEMENTS: Achievement[] = [
  { id: "first-ticket", title: "Первый билет", icon: "🎟", earned: true },
  { id: "loyal-fan", title: "Преданный фанат", icon: "🔥", earned: false },
  { id: "own-jersey", title: "Своя футболка", icon: "👕", earned: false },
];

const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

export default function ProfilePage() {
  const [filter, setFilter] = useState<Filter>("active");
  const [pushAway, setPushAway] = useState(CURRENT_USER.pushAwayMatches);

  const tickets = useMemo(
    () => TICKETS.filter((t) => t.status === filter),
    [filter],
  );

  const matchesAttended = TICKETS.filter((t) => t.status === "archived").length || 1;

  const { currentRank, nextRank, progressTo } = useMemo(() => {
    const sorted = [...RANKS].sort((a, b) => a.minMatches - b.minMatches);
    let curr = sorted[0];
    let next: Rank | null = null;
    for (let i = 0; i < sorted.length; i++) {
      if (matchesAttended >= sorted[i].minMatches) {
        curr = sorted[i];
        next = sorted[i + 1] ?? null;
      }
    }
    const target = next ? next.minMatches : curr.minMatches;
    return { currentRank: curr, nextRank: next, progressTo: target };
  }, [matchesAttended]);

  const progressPct = nextRank
    ? Math.min(100, Math.round((matchesAttended / progressTo) * 100))
    : 100;

  const initials = CURRENT_USER.displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader eyebrow="Профиль" title="Личный кабинет" />

      {/* User card */}
      <section className="glass-premium flex items-center gap-4 rounded-3xl p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/60 to-accent/20 font-mono text-lg font-bold text-[#04111a]">
          {initials}
        </div>
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-widest text-muted">
            Болельщик
          </p>
          <p className="text-[17px] font-semibold text-foreground">
            {CURRENT_USER.displayName}
          </p>
        </div>
        <button
          type="button"
          className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] text-muted transition-colors hover:text-foreground"
        >
          Редактировать
        </button>
      </section>

      {/* Fan journey / gamification */}
      <section className="space-y-3">
        <h2 className="px-1 text-[12px] font-semibold uppercase tracking-widest text-muted">
          Путь болельщика
        </h2>

        <div className="glass-premium space-y-4 rounded-3xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center">
                <div
                  className="absolute inset-0 bg-accent/15"
                  style={{ clipPath: HEX_CLIP }}
                />
                <div
                  className="absolute inset-[2px] bg-gradient-to-br from-accent/40 to-accent/10"
                  style={{ clipPath: HEX_CLIP }}
                />
                <span className="relative text-base">⭐</span>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted">
                  Текущий ранг
                </p>
                <p className="text-[17px] font-semibold text-foreground">
                  {currentRank.title}
                </p>
              </div>
            </div>

            {nextRank && (
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-widest text-muted">
                  Следующий
                </p>
                <p className="text-[13px] font-semibold text-accent">
                  {nextRank.title}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted">
                {nextRank
                  ? `Посещено матчей: ${matchesAttended}/${progressTo}`
                  : "Максимальный ранг достигнут"}
              </span>
              <span className="font-mono text-accent">{progressPct}%</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent/70 to-accent"
                style={{
                  width: `${progressPct}%`,
                  boxShadow: "0 0 12px rgba(0, 240, 255, 0.55)",
                }}
              />
            </div>
          </div>
        </div>

        <div className="glass-premium rounded-3xl p-4">
          <p className="mb-4 text-[12px] font-semibold uppercase tracking-widest text-muted">
            Достижения
          </p>
          <div className="grid grid-cols-3 gap-3">
            {ACHIEVEMENTS.map((a) => (
              <div
                key={a.id}
                className={`flex flex-col items-center gap-2 transition-opacity ${
                  a.earned ? "opacity-100" : "opacity-40"
                }`}
              >
                <div className="relative flex h-20 w-20 items-center justify-center">
                  {a.earned && (
                    <div
                      aria-hidden
                      className="absolute inset-0 blur-md"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(0, 240, 255, 0.55), transparent 65%)",
                      }}
                    />
                  )}
                  <div
                    className="absolute inset-0"
                    style={{
                      clipPath: HEX_CLIP,
                      background: a.earned
                        ? "linear-gradient(135deg, rgba(0, 240, 255, 0.35), rgba(0, 240, 255, 0.08))"
                        : "rgba(255, 255, 255, 0.04)",
                    }}
                  />
                  <div
                    className="absolute inset-[2px]"
                    style={{
                      clipPath: HEX_CLIP,
                      background: a.earned
                        ? "linear-gradient(160deg, rgba(11, 19, 43, 0.85), rgba(11, 19, 43, 0.6))"
                        : "rgba(11, 19, 43, 0.7)",
                    }}
                  />
                  <span className="relative text-2xl">{a.icon}</span>
                </div>
                <p
                  className={`text-center text-[11px] leading-tight ${
                    a.earned ? "text-foreground" : "text-muted"
                  }`}
                >
                  {a.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Settings */}
      <section className="space-y-3">
        <h2 className="px-1 text-[12px] font-semibold uppercase tracking-widest text-muted">
          Настройки
        </h2>
        <ToggleSwitch
          checked={pushAway}
          onChange={setPushAway}
          label="Push-уведомления о выездных матчах"
          description="Получайте напоминания о стартовом свистке и важных событиях"
        />
      </section>

      {/* Tickets inventory */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="px-1 text-[12px] font-semibold uppercase tracking-widest text-muted">
            Мои билеты
          </h2>
          <div className="glass-premium relative grid grid-cols-2 rounded-xl p-0.5 text-[12px]">
            <span
              aria-hidden
              className={`absolute inset-y-0.5 w-[calc(50%-2px)] rounded-lg bg-accent/15 ring-1 ring-accent/40 transition-transform ${
                filter === "active" ? "translate-x-0.5" : "translate-x-[calc(100%+1px)]"
              }`}
            />
            {(["active", "archived"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`relative z-10 px-3 py-1.5 ${
                  filter === f ? "text-accent" : "text-muted"
                }`}
              >
                {f === "active" ? "Активные" : "Архив"}
              </button>
            ))}
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="glass-premium rounded-2xl p-6 text-center text-[13px] text-muted">
            Билетов пока нет.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {tickets.map((t) => (
              <DigitalTicket key={t.id} ticket={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
