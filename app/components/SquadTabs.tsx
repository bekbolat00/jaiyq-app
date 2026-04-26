"use client";

import type { Squad } from "@/lib/types";

type Props = {
  value: Squad;
  onChange: (value: Squad) => void;
};

const OPTIONS: { id: Squad; label: string }[] = [
  { id: "main", label: "Основной состав" },
  { id: "academy", label: "Академия" },
];

export default function SquadTabs({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      className="glass relative grid grid-cols-2 rounded-2xl p-1"
    >
      <span
        aria-hidden
        className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-xl bg-accent/15 shadow-[0_0_20px_-4px_rgba(0,240,255,0.45)] ring-1 ring-accent/45 transition-transform duration-300 ease-out ${
          value === "main" ? "translate-x-1" : "translate-x-[calc(100%+3px)]"
        }`}
      />
      {OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={`relative z-10 h-10 rounded-xl text-[13px] font-semibold transition-colors ${
              active ? "neon-cyan text-accent" : "text-muted"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
