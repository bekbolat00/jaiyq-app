"use client";

import MusicToggle from "@/app/components/MusicToggle";

/** Держит `<audio>` вне смены страниц маршрутизатора. */
export default function GlobalMusicToggle() {
  return (
    <div className="pointer-events-auto fixed right-[max(4.5rem,calc(50vw-240px+4.5rem))] top-[calc(10px+env(safe-area-inset-top))] z-[60]">
      <MusicToggle />
    </div>
  );
}
