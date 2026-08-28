import type { RosterPlayer } from "@/lib/team/fetchTeamRoster";

type Props = {
  player: RosterPlayer;
};

export default function RosterPlayerCard({ player }: Props) {
  const hasNumber = player.number !== "—";

  return (
    <div className="glass-premium group relative flex flex-col items-center gap-2 rounded-2xl p-3 pt-5 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(0,240,255,0.35),0_0_32px_-8px_rgba(0,240,255,0.5)]">
      <div className="relative shrink-0">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full bg-[#00F0FF]/20 blur-xl transition-opacity duration-300 group-hover:bg-[#00F0FF]/30"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- remote/local player photo URLs */}
        <img
          src={player.photoUrl || "/default-avatar.png"}
          alt=""
          className="h-20 w-20 rounded-full border-2 border-white/15 object-cover shadow-[0_8px_24px_rgba(0,0,0,0.45)] sm:h-24 sm:w-24"
        />
        {hasNumber && (
          <span className="neon-cyan absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/75 font-mono text-[11px] font-bold text-accent backdrop-blur-md">
            {player.number}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-bold uppercase leading-tight text-foreground">
          {player.surname}
        </p>
        <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
          {player.position}
        </p>
      </div>
    </div>
  );
}
