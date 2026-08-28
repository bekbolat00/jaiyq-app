"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { positionFullLabel } from "@/lib/players/position";

export type ProfileModalPlayer = {
  id: string;
  num: string;
  firstName: string;
  surname: string;
  pos: string;
  photoUrl: string | null;
  teamName: string;
  heightCm: number | null;
  weightKg: number | null;
  /** `YYYY-MM-DD`. */
  birthDate: string | null;
  goals: number | null;
  matchesPlayed: number | null;
  minutesPlayed: number | null;
};

type Props = {
  player: ProfileModalPlayer | null;
  onClose: () => void;
};

function formatBirthDate(iso: string | null): string {
  const m = (iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : "—";
}

function formatMetric(value: number | null, suffix: string): string {
  return value == null ? "—" : `${value} ${suffix}`;
}

function InfoCell({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`px-3 py-3 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
        {label}
      </p>
      <p className="mt-1 truncate text-[14px] font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="glass-strong flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-4">
      <p className="font-mono text-[28px] font-black leading-none text-foreground">
        {value}
      </p>
      <p className="text-center text-[9px] font-bold uppercase tracking-widest text-muted">
        {label}
      </p>
    </div>
  );
}

export default function PlayerProfileModal({ player, onClose }: Props) {
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

  return (
    <AnimatePresence>
      {player && (
        <motion.div
          key={player.id}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="dialog"
          aria-modal
          aria-labelledby="player-profile-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
        >
          <motion.div
            role="presentation"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="glass-premium relative z-10 flex w-full max-w-sm flex-col overflow-hidden rounded-3xl"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Закрыть"
              onClick={onClose}
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-foreground backdrop-blur-md transition-colors hover:bg-black/60"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>

            {/* Хиро: имя/номер слева, огромное фото игрока справа (вырезка KFF ложится сюда как есть) */}
            <div className="relative h-[230px] w-full shrink-0 overflow-hidden bg-black/50">
              <div className="absolute inset-y-0 right-0 w-[62%]">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote/local player photo URLs */}
                <img
                  src={player.photoUrl || "/default-avatar.png"}
                  alt=""
                  className="h-full w-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#020408]" />
              </div>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#020408] via-[#020408]/5 to-transparent"
              />
              <div className="relative z-10 flex h-full max-w-[52%] flex-col justify-end p-4">
                {player.num !== "—" && (
                  <span className="neon-cyan font-mono text-[52px] font-black leading-none text-accent">
                    #{player.num}
                  </span>
                )}
                <h1
                  id="player-profile-title"
                  className="mt-1 text-balance text-[24px] font-black uppercase leading-[0.95] text-foreground"
                >
                  {player.surname}
                </h1>
                {player.firstName ? (
                  <p className="mt-0.5 truncate text-[13px] font-semibold text-foreground/75">
                    {player.firstName}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-4 p-4">
              <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-white/10">
                <InfoCell
                  label="Амплуа"
                  value={positionFullLabel(player.pos)}
                  className="border-b border-r border-white/10"
                />
                <InfoCell
                  label="Команда"
                  value={player.teamName}
                  className="border-b border-white/10"
                />
                <InfoCell
                  label="Рост"
                  value={formatMetric(player.heightCm, "см")}
                  className="border-r border-white/10"
                />
                <InfoCell
                  label="Вес"
                  value={formatMetric(player.weightKg, "кг")}
                />
                <InfoCell
                  label="Дата рождения"
                  value={formatBirthDate(player.birthDate)}
                  className="col-span-2 border-t border-white/10"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <StatBlock
                  value={player.goals == null ? "—" : String(player.goals)}
                  label="Голы"
                />
                <StatBlock
                  value={
                    player.matchesPlayed == null
                      ? "—"
                      : String(player.matchesPlayed)
                  }
                  label="Матчей"
                />
                <StatBlock
                  value={
                    player.minutesPlayed == null
                      ? "—"
                      : String(player.minutesPlayed)
                  }
                  label="Минут"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
