"use client";

import { displayCase } from "@/lib/text/displayCase";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
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


function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-4 py-3">
      <span className="t-small text-muted">{label}</span>
      <span className="t-body truncate text-right text-foreground">{value}</span>
    </div>
  );
}

function StatBlock({ value, label }: { value: number | null; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-surface-2 px-2 py-3">
      <span className="t-h3 tabular-nums text-foreground">{value == null ? "—" : value}</span>
      <span className="t-caption text-muted">{label}</span>
    </div>
  );
}

export default function PlayerProfileModal({ player, onClose }: Props) {
  useTelegramBackButton(player != null, onClose);
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

  const hasNumber = player != null && player.num.trim() !== "" && player.num !== "—";
  const position = player ? positionFullLabel(player.pos) : "";
  const meta = player ? [hasNumber ? `№ ${player.num}` : null, position || null].filter(Boolean).join(" · ") : "";

  return (
    <AnimatePresence>
      {player && (
        <motion.div
          key={player.id}
          className="fixed inset-0 z-[70] flex flex-col justify-end"
          role="dialog"
          aria-modal
          aria-labelledby="player-profile-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          <motion.div
            role="presentation"
            className="absolute inset-0 bg-background/80"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative z-10 mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-b-0 border-line bg-surface"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong" aria-hidden />

            <button
              type="button"
              aria-label="Закрыть"
              onClick={onClose}
              className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors active:bg-surface-2"
            >
              <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </button>

            <div className="overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
              <div className="flex items-end gap-4">
                <div className="h-[120px] w-[96px] shrink-0 overflow-hidden rounded-2xl bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote/local player photo URLs */}
                  <img
                    src={player.photoUrl || "/default-avatar.png"}
                    alt=""
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <div className="min-w-0 flex-1 pb-1 pr-8">
                  <p className="t-label text-subtle">{player.teamName}</p>
                  <h2 id="player-profile-title" className="t-h2 mt-1.5 text-foreground [overflow-wrap:anywhere]">
                    {displayCase(player.surname)}
                    {player.firstName ? (
                      <span className="block font-normal text-muted">{displayCase(player.firstName)}</span>
                    ) : null}
                  </h2>
                  {meta ? <p className="t-small mt-1.5 text-muted">{meta}</p> : null}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2">
                <StatBlock value={player.goals} label="Голы" />
                <StatBlock value={player.matchesPlayed} label="Матчи" />
                <StatBlock value={player.minutesPlayed} label="Минуты" />
              </div>

              <div className="mt-4 divide-y divide-line">
                <InfoRow label="Рост" value={formatMetric(player.heightCm, "см")} />
                <InfoRow label="Вес" value={formatMetric(player.weightKg, "кг")} />
                <InfoRow label="Дата рождения" value={formatBirthDate(player.birthDate)} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
