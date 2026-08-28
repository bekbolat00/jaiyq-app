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
};

type Props = {
  player: ProfileModalPlayer | null;
  onClose: () => void;
};

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
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="glass-premium relative z-10 flex w-full max-w-sm flex-col items-center overflow-hidden rounded-3xl p-6 text-center"
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
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-foreground backdrop-blur-md transition-colors hover:bg-black/50"
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

            <div className="relative mt-2 shrink-0">
              <div
                aria-hidden
                className="absolute inset-0 -z-10 rounded-full bg-[#00F0FF]/25 blur-2xl"
              />
              {/* eslint-disable-next-line @next/next/no-img-element -- remote/local player photo URLs */}
              <img
                src={player.photoUrl || "/default-avatar.png"}
                alt=""
                className="h-32 w-32 rounded-full border-2 border-white/15 object-cover shadow-[0_12px_36px_rgba(0,0,0,0.5)]"
              />
              {player.num !== "—" && (
                <span className="neon-cyan absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/75 font-mono text-[13px] font-bold text-accent backdrop-blur-md">
                  {player.num}
                </span>
              )}
            </div>

            <h1
              id="player-profile-title"
              className="mt-4 text-2xl font-black uppercase leading-tight text-foreground"
            >
              {player.surname}
            </h1>
            {player.firstName ? (
              <p className="text-[13px] font-semibold text-foreground/80">
                {player.firstName}
              </p>
            ) : null}

            <div className="mt-5 grid w-full grid-cols-2 gap-0 overflow-hidden rounded-xl border border-white/10 text-left">
              <div className="border-b border-r border-white/10 px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  Команда
                </p>
                <p className="mt-1 truncate text-[14px] font-semibold text-foreground">
                  {player.teamName}
                </p>
              </div>
              <div className="border-b border-white/10 px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  Номер
                </p>
                <p className="mt-1 text-[14px] font-semibold text-foreground">
                  {player.num !== "—" ? `#${player.num}` : "—"}
                </p>
              </div>
              <div className="col-span-2 px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  Позиция
                </p>
                <p className="neon-cyan mt-1 text-[14px] font-semibold text-accent">
                  {positionFullLabel(player.pos)}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
