"use client";

import {
  surnameFromDisplayLabel,
  type LineBlock,
  type LinePlayerRow,
} from "@/lib/matches/matchDetailFromDb";
import {
  formationLabelFromStarters,
  getCoordinates,
  groupStartersByFieldLine,
} from "@/lib/matches/formationLayout";
import type { Team } from "@/lib/types";

type PitchPlaced = LinePlayerRow & {
  top: string;
  left: string;
  kitColor: string;
};

function pitchSurnameLabel(p: LinePlayerRow): string {
  const s = (p.surname || surnameFromDisplayLabel(p.name)).trim();
  return s.toUpperCase();
}

/** Хозяева — у ворот сверху (`fromTopGoal`), гости — снизу. */
function placeTeamOnPitch(
  starters: LinePlayerRow[],
  fromTopGoal: boolean,
  kitColor: string,
): PitchPlaced[] {
  const groups = groupStartersByFieldLine(starters);
  const out: PitchPlaced[] = [];
  const keys: Array<"вр" | "зщ" | "пз" | "нп"> = ["вр", "зщ", "пз", "нп"];
  for (const k of keys) {
    const row = (groups.get(k) ?? []) as LinePlayerRow[];
    const n = row.length;
    for (let i = 0; i < n; i++) {
      const pl = row[i]!;
      const coord = getCoordinates(k, i, n, fromTopGoal);
      out.push({ ...pl, ...coord, kitColor });
    }
  }
  return out;
}

function JerseyIcon({ fill, num }: { fill: string; num: string }) {
  return (
    <div className="relative h-9 w-8 shrink-0">
      <svg
        className="h-9 w-8 drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]"
        viewBox="0 0 32 38"
        fill="none"
        aria-hidden
      >
        <path
          d="M6 10c0-2.5 2-4.5 10-4.5s10 2 10 4.5v2l4 3v8l-3.2 1.2L24 34H8L7.2 24.2 4 23V15l4-3v-2z"
          fill={fill}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="0.6"
        />
        <path
          d="M10 10c2-1 4-1.5 6-1.5s4 .5 6 1.5"
          stroke="rgba(0,0,0,0.12)"
          strokeWidth="0.5"
          fill="none"
        />
      </svg>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center pb-1 text-[11px] font-bold leading-none text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
        {num}
      </span>
    </div>
  );
}

function PlayerChip({
  num,
  surname,
  kitColor,
  top,
  left,
}: {
  num: string;
  surname: string;
  kitColor: string;
  top: string;
  left: string;
}) {
  return (
    <div
      className="pointer-events-none absolute z-[5] -translate-x-1/2 -translate-y-1/2"
      style={{ top, left }}
    >
      <div className="relative flex max-w-[6.5rem] flex-col items-center">
        <JerseyIcon fill={kitColor} num={num} />
        <span className="mt-0.5 w-full text-center text-[9px] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] [text-wrap:balance]">
          {surname}
        </span>
        <span className="mt-0.5 text-center text-[10px] leading-none" aria-hidden>
          🇰🇿
        </span>
      </div>
    </div>
  );
}

function coachHeadline(block: LineBlock): string {
  const c = block.coaches[0];
  if (!c?.name?.trim()) return "—";
  return c.name.trim();
}

function SquadListColumn({
  blockLabel,
  teamName,
  block,
}: {
  blockLabel: string;
  teamName: string;
  block: LineBlock;
}) {
  const Row = ({ p }: { p: LinePlayerRow }) => (
    <li className="flex items-center gap-2 py-0.5 text-[10px] text-white/90">
      <span
        className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-[8px] font-mono font-bold text-accent"
        aria-hidden
      >
        {p.num}
      </span>
      <span className="min-w-0 font-semibold uppercase">
        {pitchSurnameLabel(p)}
      </span>
    </li>
  );

  return (
    <div className="glass rounded-2xl p-3 sm:p-4">
      <p className="text-center text-[7px] font-bold uppercase tracking-[0.2em] text-white/40">
        {blockLabel}
      </p>
      <p className="text-center text-[8px] font-extrabold uppercase tracking-tight text-white/70">
        {teamName}
      </p>
      <p className="mb-1.5 mt-3 text-[8px] font-black uppercase tracking-[0.2em] text-white/40">
        ОСНОВНОЙ СОСТАВ
      </p>
      <ul className="space-y-0">
        {block.starters.length ? (
          block.starters.map((p) => <Row key={p.id} p={p} />)
        ) : (
          <li className="text-[10px] text-white/30">—</li>
        )}
      </ul>
      <p className="mb-1.5 mt-3 text-[8px] font-black uppercase tracking-[0.2em] text-white/40">
        ЗАПАСНЫЕ
      </p>
      <ul className="space-y-0">
        {block.bench.length ? (
          block.bench.map((p) => <Row key={p.id} p={p} />)
        ) : (
          <li className="text-[10px] text-white/30">—</li>
        )}
      </ul>
      <p className="mb-1.5 mt-3 text-[8px] font-black uppercase tracking-[0.2em] text-white/40">
        ТРЕНЕРЫ
      </p>
      <ul className="space-y-0">
        {block.coaches.length ? (
          block.coaches.map((p) => <Row key={p.id} p={p} />)
        ) : (
          <li className="text-[10px] text-white/30">—</li>
        )}
      </ul>
    </div>
  );
}

export type FormationPitchProps = {
  home: Team;
  away: Team;
  homeSquad: LineBlock;
  awaySquad: LineBlock;
  /** Цвет формы хозяев в этом матче (из teams.home_color). */
  homeKitColor: string;
  /** Цвет формы гостей в этом матче (из teams.away_color). */
  awayKitColor: string;
};

export default function FormationPitch({
  home,
  away,
  homeSquad,
  awaySquad,
  homeKitColor,
  awayKitColor,
}: FormationPitchProps) {
  const homePlaced = placeTeamOnPitch(homeSquad.starters, true, homeKitColor);
  const awayPlaced = placeTeamOnPitch(awaySquad.starters, false, awayKitColor);
  const homeFormation = formationLabelFromStarters(homeSquad.starters);
  const awayFormation = formationLabelFromStarters(awaySquad.starters);
  const homeCoach = coachHeadline(homeSquad);
  const awayCoach = coachHeadline(awaySquad);

  return (
    <div className="w-full">
      <div
        className="relative mt-4 w-full overflow-hidden rounded-xl border-2 border-white/18 bg-[#0d2416] shadow-[inset_0_0_40px_rgba(0,0,0,0.35)]"
        style={{ minHeight: "580px", height: "580px" }}
      >
        <div
          className="pointer-events-none absolute inset-0 z-[1] rounded-xl bg-black/20"
          aria-hidden
        />
        {/* Верх: хозяева — шапка слева, схема справа */}
        <div className="pointer-events-none absolute left-2 top-2 z-20 flex max-w-[55%] items-start gap-2">
          {home.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={home.logoUrl}
              alt=""
              className="h-10 w-10 shrink-0 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
            />
          ) : null}
          <div className="min-w-0 text-left">
            <p className="text-[16px] font-extrabold leading-tight text-white">
              {home.shortName}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-medium leading-snug text-white/85">
              <span>{homeCoach}</span>
              <span aria-hidden>🇰🇿</span>
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute right-2 top-2 z-20">
          <p className="text-right text-[11px] font-bold tabular-nums tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)]">
            {homeFormation}
          </p>
        </div>

        {/* Низ: гости — схема слева, шапка справа */}
        <div className="pointer-events-none absolute bottom-2 left-2 z-20">
          <p className="text-left text-[11px] font-bold tabular-nums tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)]">
            {awayFormation}
          </p>
        </div>
        <div className="pointer-events-none absolute bottom-2 right-2 z-20 flex max-w-[55%] flex-row-reverse items-end gap-2 text-right">
          {away.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={away.logoUrl}
              alt=""
              className="h-10 w-10 shrink-0 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-[16px] font-extrabold leading-tight text-white">
              {away.shortName}
            </p>
            <p className="mt-1 flex flex-wrap items-center justify-end gap-1 text-[11px] font-medium leading-snug text-white/85">
              <span>{awayCoach}</span>
              <span aria-hidden>🇰🇿</span>
            </p>
          </div>
        </div>

        <div className="absolute inset-x-2 top-[22%] bottom-[22%] z-[2] rounded-md border border-white/20">
          <div className="relative z-[2] h-full w-full">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div className="absolute top-1/2 w-full border-t border-white/22" />
              <div className="absolute top-1/2 left-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/22" />
              <div className="absolute top-0 left-1/2 h-[20%] w-[58%] -translate-x-1/2 border-x border-b border-white/22" />
              <div className="absolute bottom-0 left-1/2 h-[20%] w-[58%] -translate-x-1/2 border-x border-t border-white/22" />
            </div>

            {homePlaced.map((pl) => (
              <PlayerChip
                key={`h-${pl.id}`}
                num={pl.num}
                surname={pitchSurnameLabel(pl)}
                kitColor={pl.kitColor}
                top={pl.top}
                left={pl.left}
              />
            ))}
            {awayPlaced.map((pl) => (
              <PlayerChip
                key={`a-${pl.id}`}
                num={pl.num}
                surname={pitchSurnameLabel(pl)}
                kitColor={pl.kitColor}
                top={pl.top}
                left={pl.left}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid min-h-0 grid-cols-1 gap-4 min-[500px]:grid-cols-2 min-[500px]:gap-5">
        <SquadListColumn
          blockLabel="Хозяева"
          teamName={home.shortName}
          block={homeSquad}
        />
        <SquadListColumn
          blockLabel="Гости"
          teamName={away.shortName}
          block={awaySquad}
        />
      </div>
    </div>
  );
}
