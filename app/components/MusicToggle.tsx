"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

type AudioState = "loading" | "ready" | "error";

export default function MusicToggle() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioState, setAudioState] = useState<AudioState>("loading");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleReady = () => setAudioState("ready");
    const handleError = () => {
      setIsPlaying(false);
      setAudioState("error");
    };

    audio.addEventListener("canplay", handleReady);
    audio.addEventListener("error", handleError);
    if (audio.readyState >= 2) setAudioState("ready");

    return () => {
      audio.removeEventListener("canplay", handleReady);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  const handleClick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audioState === "error") {
      setAudioState("loading");
      audio.load();
      return;
    }

    if (audio.paused) {
      void audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err: unknown) => {
          const name = err instanceof Error ? err.name : "Error";
          const message = err instanceof Error ? err.message : String(err);
          console.warn(name, message);
        });
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [audioState]);

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
    <div className="shrink-0">
      <button
        type="button"
        onClick={handleClick}
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

      <audio
        ref={audioRef}
        src="/sounds/uralsk.mp3"
        preload="auto"
        loop
        playsInline
        style={{ display: "none" }}
      />
    </div>
  );
}
