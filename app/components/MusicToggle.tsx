"use client";

import { motion } from "framer-motion";
import { useMusicPlayer } from "@/app/components/MusicPlayerProvider";

export default function MusicToggle() {
  const { isPlaying, audioState, toggle } = useMusicPlayer();

  const ariaLabel =
    audioState === "error"
      ? "Ошибка загрузки. Нажмите, чтобы повторить"
      : isPlaying
        ? "Выключить музыку"
        : "Включить музыку";

  const trackClass =
    audioState === "error"
      ? "bg-red-500/50"
      : audioState === "ready"
        ? isPlaying
          ? "bg-accent"
          : "bg-white/20"
        : "bg-white/20";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={audioState !== "error" ? isPlaying : undefined}
      aria-busy={audioState === "loading"}
      aria-label={ariaLabel}
      className={`relative h-6 w-12 shrink-0 overflow-hidden rounded-full border-0 p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        audioState === "error" ? "cursor-pointer" : ""
      }`}
    >
      <div className={`absolute inset-0 ${trackClass}`} />
      <motion.span
        className="pointer-events-none absolute top-0.5 left-0 h-5 w-5 rounded-full bg-white shadow-sm"
        initial={false}
        animate={{ x: isPlaying ? 24 : 2 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 32,
          mass: 0.4,
        }}
      />
    </button>
  );
}
