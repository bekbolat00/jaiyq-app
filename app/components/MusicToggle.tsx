"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "jaiyq:global-music";
const THUMB = 22;
const PAD = 2;
const TRACK_W = 48;
/** Horizontal travel for the thumb (iOS-style inset). */
const TRAVEL = TRACK_W - PAD * 2 - THUMB;

let globalAudio: HTMLAudioElement | null = null;

export default function MusicToggle() {
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!globalAudio) {
      globalAudio = new Audio("/sounds/uralsk.mp3");
      globalAudio.loop = true;
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        if (localStorage.getItem(STORAGE_KEY) === "on") setOn(true);
      } catch {
        /* ignore */
      }
      setReady(true);
    });
  }, []);

  const applyPlayback = useCallback((next: boolean) => {
    const el = globalAudio;
    if (!el) return;
    if (next) {
      try {
        void el.play().catch(() => {
          /* autoplay / gesture policy */
        });
      } catch {
        /* ignore */
      }
    } else {
      el.pause();
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
    } catch {
      /* ignore */
    }
    applyPlayback(on);
  }, [on, ready, applyPlayback]);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={on ? "Музыка включена" : "Музыка выключена"}
      onClick={() => setOn((v) => !v)}
      className="relative h-7 w-12 shrink-0 appearance-none overflow-hidden rounded-full border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <div
        className={`absolute inset-0 rounded-full transition-colors duration-200 ${
          on ? "bg-accent" : "bg-white/20"
        }`}
      />
      <motion.span
        className="pointer-events-none absolute top-[3px] z-10 h-[22px] w-[22px] rounded-full bg-white shadow-sm"
        style={{ left: PAD }}
        initial={false}
        animate={{ x: on ? TRAVEL : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 32, mass: 0.4 }}
      />
    </button>
  );
}
