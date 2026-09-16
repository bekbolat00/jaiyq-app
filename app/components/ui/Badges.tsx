export type MatchOutcome = "win" | "draw" | "loss";

const OUTCOME: Record<MatchOutcome, { label: string; cls: string; title: string }> = {
  win: { label: "В", cls: "bg-win/15 text-win", title: "Победа" },
  draw: { label: "Н", cls: "bg-draw/15 text-draw", title: "Ничья" },
  loss: { label: "П", cls: "bg-loss/15 text-loss", title: "Поражение" },
};

export function outcomeFor(zhaiyq: number | null, opponent: number | null): MatchOutcome | null {
  if (zhaiyq == null || opponent == null) return null;
  if (zhaiyq > opponent) return "win";
  if (zhaiyq < opponent) return "loss";
  return "draw";
}

/** В / Н / П — итог матча для Жайыка. */
export function ResultBadge({ outcome }: { outcome: MatchOutcome }) {
  const o = OUTCOME[outcome];
  return (
    <span
      title={o.title}
      aria-label={o.title}
      className={`inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md text-[12px] font-semibold ${o.cls}`}
    >
      {o.label}
    </span>
  );
}

/** Бейдж идущего матча: пульсирующая точка + минута. */
export function LiveBadge({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-live/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-live">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-live" />
      </span>
      {label}
    </span>
  );
}
