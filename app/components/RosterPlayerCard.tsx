import type { RosterPlayer } from "@/lib/team/fetchTeamRoster";

type Props = {
  player: RosterPlayer;
};

/**
 * Тот же глянцевый макет карточки, что и у `PlayerCard` (моки/академия),
 * но вместо SVG-силуэта — реальное фото игрока (вырезка KFF с прозрачным
 * фоном ложится сюда без доработок).
 */
export default function RosterPlayerCard({ player }: Props) {
  const hasNumber = player.number !== "—";

  return (
    <div className="glass-premium group relative mt-10 flex aspect-[3/4.4] w-full flex-col justify-end overflow-visible rounded-2xl text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(0,240,255,0.35),0_0_40px_-6px_rgba(0,240,255,0.55),0_24px_64px_-24px_rgba(0,240,255,0.35)]">
      <div className="absolute inset-x-0 -top-7 bottom-[48%]">
        {hasNumber && (
          <div className="absolute left-3 top-[calc(1.75rem+8px)] z-10 rounded-md border border-white/10 bg-black/45 px-2 py-0.5 font-mono text-[11px] font-bold text-accent backdrop-blur-md neon-cyan">
            #{player.number}
          </div>
        )}

        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <div
            aria-hidden
            className="absolute bottom-[8%] left-1/2 h-[min(95%,220px)] w-[88%] max-w-[200px] -translate-x-1/2 rounded-full bg-[#00F0FF]/25 blur-[48px] transition-all duration-300 group-hover:bg-[#00F0FF]/35 group-hover:blur-[56px]"
          />
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element -- remote/local player photo URLs */}
        <img
          src={player.photoUrl || "/default-avatar.png"}
          alt=""
          className="absolute inset-x-0 bottom-0 mx-auto h-[112%] w-auto -translate-y-3 object-contain drop-shadow-[0_12px_32px_rgba(0,240,255,0.22)] transition-transform duration-300 group-hover:scale-[1.05]"
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[52%] bg-gradient-to-t from-[#020408] via-[#020408]/88 to-transparent" />

      <div className="relative z-10 mt-auto overflow-hidden rounded-b-2xl px-3 pb-3.5 pt-10">
        {hasNumber && (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-1 left-1/2 z-0 -translate-x-1/2 select-none font-mono text-[clamp(4.5rem,32vw,7.5rem)] font-black leading-none text-white/[0.07]"
          >
            {player.number}
          </span>
        )}
        <div className="relative z-10">
          {player.firstName && (
            <p className="truncate text-[13px] font-semibold leading-tight text-foreground/90">
              {player.firstName}
            </p>
          )}
          <p className="truncate text-[17px] font-bold leading-tight text-foreground">
            {player.surname}
          </p>
          <p className="neon-cyan mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
            {player.position}
          </p>
        </div>
      </div>
    </div>
  );
}
