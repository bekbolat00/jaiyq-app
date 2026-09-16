"use client";

import { Music2, VolumeX } from "lucide-react";
import { useMusicPlayer } from "@/app/components/MusicPlayerProvider";
import { haptic } from "@/lib/telegram/webApp";

/** Фоновая музыка — понятная иконка вместо безымянного переключателя. */
export default function MusicToggle() {
  const { isPlaying, audioState, toggle } = useMusicPlayer();

  const ariaLabel =
    audioState === "error"
      ? "Ошибка загрузки. Нажмите, чтобы повторить"
      : isPlaying
        ? "Выключить музыку"
        : "Включить музыку";

  const Icon = isPlaying ? Music2 : VolumeX;

  return (
    <button
      type="button"
      onClick={() => {
        haptic.select();
        toggle();
      }}
      aria-pressed={audioState !== "error" ? isPlaying : undefined}
      aria-busy={audioState === "loading"}
      aria-label={ariaLabel}
      className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors active:scale-95 ${
        isPlaying ? "bg-accent/12 text-accent" : "bg-surface-2 text-muted"
      } ${audioState === "error" ? "text-loss" : ""}`}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
    </button>
  );
}
