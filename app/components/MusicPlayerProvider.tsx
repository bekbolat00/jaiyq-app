"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type MusicAudioState = "loading" | "ready" | "error";

type MusicPlayerContextValue = {
  isPlaying: boolean;
  audioState: MusicAudioState;
  toggle: () => void;
};

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

export function useMusicPlayer(): MusicPlayerContextValue {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) {
    throw new Error("useMusicPlayer must be used within MusicPlayerProvider");
  }
  return ctx;
}

export default function MusicPlayerProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioState, setAudioState] = useState<MusicAudioState>("loading");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const markReady = () => setAudioState("ready");
    const handleError = () => {
      setIsPlaying(false);
      setAudioState("error");
    };

    audio.addEventListener("canplay", markReady);
    audio.addEventListener("loadeddata", markReady);
    audio.addEventListener("error", handleError);
    if (audio.readyState >= 2) setAudioState("ready");

    return () => {
      audio.removeEventListener("canplay", markReady);
      audio.removeEventListener("loadeddata", markReady);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  const toggle = useCallback(() => {
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

  const value = useMemo(
    () => ({ isPlaying, audioState, toggle }),
    [isPlaying, audioState, toggle],
  );

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        src="/sounds/uralsk.mp3"
        preload="auto"
        loop
        playsInline
        style={{ display: "none" }}
      />
    </MusicPlayerContext.Provider>
  );
}
