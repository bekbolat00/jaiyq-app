import type { Match } from "@/lib/types";
import TeamBadge from "./TeamBadge";
import Countdown from "./Countdown";

type Props = {
  match: Match;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    weekday: "short",
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function NextMatchCard({ match }: Props) {
  return (
    <section className="glass relative overflow-hidden rounded-3xl p-5">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

      <header className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted">
        <span>{match.competition}</span>
        <span className="neon-cyan rounded-full border border-accent/35 bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
          Ближайший матч
        </span>
      </header>

      <div className="mt-5 flex items-center justify-between gap-2">
        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          <TeamBadge team={match.home} size="lg" />
          <p className="text-sm font-bold">{match.home.shortName}</p>
        </div>

        <div className="flex flex-col items-center gap-1 px-2">
          <span className="neon-cyan font-mono text-3xl font-bold text-accent">
            VS
          </span>
          <span className="text-[11px] uppercase tracking-widest text-muted">
            {formatDate(match.kickoffAt)}
          </span>
          <span className="font-mono text-sm text-foreground">
            {formatTime(match.kickoffAt)}
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          <TeamBadge team={match.away} size="lg" />
          <p className="text-sm font-bold">{match.away.shortName}</p>
        </div>
      </div>

      <p className="mt-4 text-center text-[12px] text-muted">{match.venue}</p>

      <div className="mt-5">
        <Countdown target={match.kickoffAt} />
      </div>

      <a
        href={match.ticketUrl ?? "#"}
        target={match.ticketUrl ? "_blank" : undefined}
        rel="noopener noreferrer"
        className="neon-cyan accent-glow mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-bold text-[#020408] transition-all hover:brightness-110 active:scale-[0.99]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M3 9.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4v-1Z" />
          <path d="M10 7v12" />
        </svg>
        Купить билет
      </a>
    </section>
  );
}
