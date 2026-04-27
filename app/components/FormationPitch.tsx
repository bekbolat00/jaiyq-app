"use client";

import type { LineBlock, LinePlayerRow } from "@/lib/matches/matchDetailFromDb";
import {
  formationLabelFromStarters,
  getCoordinates,
  groupStartersByFieldLine,
} from "@/lib/matches/formationLayout";
import type { Team } from "@/lib/types";

type PitchPlaced = LinePlayerRow & { top: string; left: string; zhai: boolean };

function isZhayykName(name: string) {
  const n = name.toLowerCase();
  return n.includes("жай") || n.includes("zhai");
}

function familyLabel(displayName: string): string {
  const t = displayName.trim();
  const m = t.match(/^[А-ЯA-ZЁІ]\.\s*(.+)$/);
  if (m?.[1]) return m[1]!.toUpperCase();
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 1]!.toUpperCase();
  return t.toUpperCase();
}

function placeTeamOnPitch(
  starters: LinePlayerRow[],
  isAway: boolean,
  isZhaiyq: boolean,
): PitchPlaced[] {
  const groups = groupStartersByFieldLine(starters);
  const out: PitchPlaced[] = [];
  const keys: Array<"вр" | "зщ" | "пз" | "нп"> = ["вр", "зщ", "пз", "нп"];
  for (const k of keys) {
    const row = (groups.get(k) ?? []) as LinePlayerRow[];
    const n = row.length;
    for (let i = 0; i < n; i++) {
      const pl = row[i]!;
      const coord = getCoordinates(k, i, n, isAway);
      out.push({ ...pl, ...coord, zhai: isZhaiyq });
    }
  }
  return out;
}

function PlayerChip({
  num,
  surname,
  isZhaiyq,
  top,
  left,
}: {
  num: string;
  surname: string;
  isZhaiyq: boolean;
  top: string;
  left: string;
}) {
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      style={{ top, left }}
    >
      <div className="relative flex flex-col items-center">
        <span className="mb-0.5 text-[9px] font-black tabular-nums leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
          {num}
        </span>
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/35 text-[10px] font-bold text-white shadow-[0_2px_8px_rgba(0,0,0,0.45)] ${
            isZhaiyq ? "bg-cyan-600" : "bg-rose-600"
          }`}
          aria-hidden
        />
        <span className="mt-0.5 max-w-[4.5rem] truncate text-center text-[7px] font-bold uppercase leading-tight tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
          {surname}
        </span>
      </div>
    </div>
  );
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
        {familyLabel(p.name)}
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
          <li className="text-[10px] text-white/30">Состав уточняется</li>
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
};

export default function FormationPitch({
  home,
  away,
  homeSquad,
  awaySquad,
}: FormationPitchProps) {
  const hZh = isZhayykName(home.shortName);
  const aZh = isZhayykName(away.shortName);
  const homePlaced = placeTeamOnPitch(homeSquad.starters, false, hZh);
  const awayPlaced = placeTeamOnPitch(awaySquad.starters, true, aZh);
  const homeFormation = formationLabelFromStarters(homeSquad.starters);
  const awayFormation = formationLabelFromStarters(awaySquad.starters);

  return (
    <div className="w-full">
      <div className="relative mt-4 aspect-[3/4] w-full overflow-hidden rounded-xl border-2 border-white/18 bg-[#1a3a2a] shadow-[inset_0_0_40px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex flex-col items-center gap-1">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
            {awayFormation}
          </p>
          {away.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={away.logoUrl}
              alt=""
              className="h-9 w-9 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
            />
          ) : null}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex flex-col items-center gap-1">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
            {homeFormation}
          </p>
          {home.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={home.logoUrl}
              alt=""
              className="h-9 w-9 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
            />
          ) : null}
        </div>

        <div className="absolute inset-x-2 top-[4.25rem] bottom-[4.25rem] rounded-md border border-white/20">
          <div className="relative h-full w-full">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div className="absolute top-1/2 w-full border-t border-white/22" />
              <div className="absolute top-1/2 left-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/22" />
              <div className="absolute top-0 left-1/2 h-[20%] w-[58%] -translate-x-1/2 border-x border-b border-white/22" />
              <div className="absolute bottom-0 left-1/2 h-[20%] w-[58%] -translate-x-1/2 border-x border-t border-white/22" />
            </div>

            {awayPlaced.map((pl) => (
              <PlayerChip
                key={`a-${pl.id}`}
                num={pl.num}
                surname={familyLabel(pl.name)}
                isZhaiyq={pl.zhai}
                top={pl.top}
                left={pl.left}
              />
            ))}
            {homePlaced.map((pl) => (
              <PlayerChip
                key={`h-${pl.id}`}
                num={pl.num}
                surname={familyLabel(pl.name)}
                isZhaiyq={pl.zhai}
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
