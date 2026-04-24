"use client";

import { useEffect } from "react";
import type { Player } from "@/lib/types";
import { PRODUCTS } from "@/lib/data/mock";

type Props = {
  player: Player | null;
  onClose: () => void;
};

export default function PlayerDetailSheet({ player, onClose }: Props) {
  useEffect(() => {
    if (!player) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [player, onClose]);

  if (!player) return null;

  const jersey = PRODUCTS.find((p) => p.id === player.jerseyProductId);

  const tiles: { label: string; value: string | number; suffix?: string }[] = [
    { label: "Рост", value: player.stats.heightCm, suffix: "см" },
    { label: "Вес", value: player.stats.weightKg, suffix: "кг" },
    { label: "Игры", value: player.stats.games },
    { label: "Голы", value: player.stats.goals },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-strong relative w-full max-w-[460px] rounded-t-3xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/20" />

        <button
          type="button"
          aria-label="Закрыть"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-muted transition-colors hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>

        <header className="flex items-end gap-4">
          <div className="font-mono text-5xl font-bold text-accent leading-none">
            #{player.number}
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-muted">
              {player.position}
            </p>
            <h2 className="text-xl font-semibold">
              {player.firstName} {player.lastName}
            </h2>
          </div>
        </header>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
            >
              <span className="text-[11px] uppercase tracking-widest text-muted">
                {t.label}
              </span>
              <span className="mt-1 font-mono text-2xl font-semibold text-foreground">
                {t.value}
                {t.suffix && (
                  <span className="ml-1 text-sm font-normal text-muted">
                    {t.suffix}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-semibold text-[#04111a] accent-glow transition-all hover:brightness-110 active:scale-[0.99]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M4 7h3l3-3h4l3 3h3v2l-2 1v9a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-9L4 9V7Z" />
          </svg>
          Купить футболку {player.lastName}
        </button>

        {jersey && (
          <p className="mt-2 text-center text-xs text-muted">
            {jersey.title} · {jersey.priceKzt.toLocaleString("ru-RU")} ₸
          </p>
        )}
      </div>
    </div>
  );
}
