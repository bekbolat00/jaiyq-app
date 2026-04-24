"use client";

import { useMemo, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import DigitalTicket from "../components/DigitalTicket";
import ToggleSwitch from "../components/ToggleSwitch";
import { CURRENT_USER, TICKETS } from "@/lib/data/mock";

type Filter = "active" | "archived";

export default function ProfilePage() {
  const [filter, setFilter] = useState<Filter>("active");
  const [pushAway, setPushAway] = useState(CURRENT_USER.pushAwayMatches);

  const tickets = useMemo(
    () => TICKETS.filter((t) => t.status === filter),
    [filter],
  );

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
      <section className="glass flex items-center gap-4 rounded-3xl p-4">
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
          <div className="glass relative grid grid-cols-2 rounded-xl p-0.5 text-[12px]">
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
          <div className="glass rounded-2xl p-6 text-center text-[13px] text-muted">
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
