"use client";

import type { Player } from "@/lib/types";

type Props = {
  player: Player;
  onClick?: (player: Player) => void;
};

export default function PlayerCard({ player, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(player)}
      className="glass-premium group relative flex aspect-[3/4.4] w-full flex-col justify-end overflow-hidden rounded-2xl text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_0_0_1px_rgba(0,240,255,0.25),0_0_30px_-4px_rgba(0,240,255,0.55),0_20px_60px_-20px_rgba(0,240,255,0.45)] active:scale-[0.99]"
    >
      <div className="absolute inset-x-0 top-0 h-[74%]">
        <div className="absolute left-3 top-3 z-10 rounded-md bg-black/50 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent backdrop-blur">
          #{player.number}
        </div>

        <div className="absolute inset-0 flex items-end justify-center">
          <div
            aria-hidden
            className="h-[95%] w-[85%] rounded-t-[40%] bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.28),transparent_70%)] transition-opacity duration-300 group-hover:opacity-90"
          />
        </div>

        <PlayerSilhouette className="absolute inset-x-0 bottom-0 mx-auto h-[100%] w-auto text-white/90 transition-transform duration-300 group-hover:scale-[1.04]" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[50%] bg-gradient-to-t from-[#060A14] via-[#060A14]/85 to-transparent" />

      <div className="relative z-10 mt-auto px-3 pb-3 pt-8">
        <p className="truncate text-[13px] font-semibold leading-tight text-foreground/90">
          {player.firstName}
        </p>
        <p className="truncate text-[17px] font-semibold leading-tight text-foreground">
          {player.lastName}
        </p>
        <p className="mt-1 truncate text-[10px] uppercase tracking-[0.18em] text-accent/80">
          {player.position}
        </p>
      </div>
    </button>
  );
}

/**
 * Simple SVG silhouette stand-in until real cut-out photos are wired in.
 * Renders transparent-background "player" with premium spotlight feel.
 */
function PlayerSilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 180"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <g fill="url(#pg)">
        <circle cx="60" cy="38" r="18" />
        <path d="M28 170c0-24 14-44 32-44s32 20 32 44v10H28v-10Z" />
        <path d="M32 95c4-10 14-18 28-18s24 8 28 18l-8 35H40l-8-35Z" />
      </g>
    </svg>
  );
}
