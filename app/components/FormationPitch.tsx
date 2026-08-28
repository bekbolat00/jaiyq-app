"use client";

import { useState } from "react";
import {
  surnameFromDisplayLabel,
  type LineBlock,
  type LinePlayerRow,
} from "@/lib/matches/matchDetailFromDb";
import { formationLabelFromStarters } from "@/lib/matches/formationLayout";
import PlayerProfileModal, {
  type ProfileModalPlayer,
} from "@/app/components/PlayerProfileModal";
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

function toProfilePlayer(p: LinePlayerRow, teamName: string): ProfileModalPlayer {
  return {
    id: p.id,
    num: p.num,
    firstName: p.firstName,
    surname: pitchSurnameLabel(p),
    pos: p.pos,
    photoUrl: p.photoUrl,
    teamName,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    birthDate: p.birthDate,
    goals: p.goals,
    matchesPlayed: p.matchesPlayed,
    minutesPlayed: p.minutesPlayed,
  };
}

const POSITION_COLUMN: Record<string, number> = {
  вр: 0,
  gk: 0,
  зщ: 1,
  cb: 1,
  lb: 1,
  rb: 1,
  wb: 1,
  пз: 2,
  cm: 2,
  cdm: 2,
  cam: 2,
  lm: 2,
  rm: 2,
  нп: 3,
  cf: 3,
  lw: 3,
  rw: 3,
  st: 3,
};

function pitchPosKey(p: LinePlayerRow): string {
  return (
    p.pos ??
    (p as LinePlayerRow & { position?: string }).position ??
    ""
  )
    .toLowerCase()
    .trim();
}

const PITCH_WIDTH = 720;
const PITCH_HEIGHT = 440;

/**
 * Горизонтальная схема (как на референсе): хозяева выстроены слева направо
 * (вратарь у левого края — нападающие ближе к центру), гости — зеркально
 * справа налево.
 */
function placeTeamOnPitch(
  players: LinePlayerRow[],
  fromLeft: boolean,
  kitColor: string,
): PitchPlaced[] {
  const fieldPlayers = players.filter((p) => {
    const pos = pitchPosKey(p);
    return pos !== "главный тренер" && pos !== "помощник тренера";
  });
  const columns: Record<number, LinePlayerRow[]> = { 0: [], 1: [], 2: [], 3: [] };
  for (const p of fieldPlayers) {
    const pos = pitchPosKey(p);
    const col =
      POSITION_COLUMN[pos] ??
      (pos === "вр" ? 0 : pos === "зщ" ? 1 : pos === "пз" ? 2 : 3);
    columns[col].push(p);
  }

  // left% для каждой колонки: fromLeft=true — вратарь у левого края, атака
  // ближе к центру; fromLeft=false — зеркально у правого края.
  const leftByColumn = fromLeft ? [8, 22, 35, 47] : [92, 78, 65, 53];

  const result: PitchPlaced[] = [];
  for (const colIdx of [0, 1, 2, 3]) {
    const group = columns[colIdx];
    if (!group.length) continue;
    const left = leftByColumn[colIdx]!;
    group.forEach((p, i) => {
      const top = group.length === 1 ? 50 : 12 + (i / (group.length - 1)) * 76;
      result.push({ ...p, top: `${top}%`, left: `${left}%`, kitColor });
    });
  }
  return result;
}

function PlayerChip({
  num,
  surname,
  photoUrl,
  top,
  left,
  kitColor,
  onClick,
}: {
  num: string;
  surname: string;
  photoUrl: string | null;
  top: string;
  left: string;
  kitColor: string;
  onClick: () => void;
}) {
  return (
    <div
      className="pointer-events-none absolute z-[6] -translate-x-1/2 -translate-y-1/2"
      style={{ top, left }}
    >
      <button
        type="button"
        onClick={onClick}
        className="pointer-events-auto flex flex-col items-center gap-1 transition-transform active:scale-95"
      >
        <div
          className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#e4e7ec]"
          style={{ boxShadow: `0 0 0 2px ${kitColor}, 0 2px 6px rgba(0,0,0,0.25)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- remote/local player photo URLs */}
          <img
            src={photoUrl || "/default-avatar.png"}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <span className="max-w-[78px] truncate text-center text-[10px] font-bold leading-tight text-[#1c2230]">
          {num} {surname}
        </span>
      </button>
    </div>
  );
}

function PitchMarkings() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gray-300" />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-300" />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-300" />
      <div className="absolute left-0 top-1/2 h-[34%] w-[6%] -translate-y-1/2 border-y border-r border-gray-300" />
      <div className="absolute right-0 top-1/2 h-[34%] w-[6%] -translate-y-1/2 border-y border-l border-gray-300" />
      <div className="absolute left-0 top-0 h-4 w-4 rounded-br-full border-b border-r border-gray-300" />
      <div className="absolute right-0 top-0 h-4 w-4 rounded-bl-full border-b border-l border-gray-300" />
      <div className="absolute bottom-0 left-0 h-4 w-4 rounded-tr-full border-r border-t border-gray-300" />
      <div className="absolute bottom-0 right-0 h-4 w-4 rounded-tl-full border-l border-t border-gray-300" />
    </div>
  );
}

function PitchHeaderBar({
  home,
  away,
  homeFormation,
  awayFormation,
}: {
  home: Team;
  away: Team;
  homeFormation: string;
  awayFormation: string;
}) {
  return (
    <div className="relative flex h-14 w-full items-stretch overflow-hidden rounded-t-xl bg-[#101d33]">
      <div className="flex flex-1 items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 items-center gap-2">
          {home.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={home.logoUrl}
              alt=""
              className="h-7 w-7 shrink-0 object-contain"
            />
          ) : null}
          <span className="truncate text-[14px] font-extrabold text-white">
            {home.shortName}
          </span>
        </div>
        <span className="shrink-0 font-mono text-[12px] font-bold text-white/55">
          {homeFormation}
        </span>
      </div>
      <div className="w-px shrink-0 bg-white/15" aria-hidden />
      <div className="flex flex-1 items-center justify-between gap-2 px-3">
        <span className="shrink-0 font-mono text-[12px] font-bold text-white/55">
          {awayFormation}
        </span>
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[14px] font-extrabold text-white">
            {away.shortName}
          </span>
          {away.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={away.logoUrl}
              alt=""
              className="h-7 w-7 shrink-0 object-contain"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SquadListColumn({
  blockLabel,
  teamName,
  block,
  onPlayerClick,
}: {
  blockLabel: string;
  teamName: string;
  block: LineBlock;
  onPlayerClick: (p: LinePlayerRow) => void;
}) {
  const Row = ({ p }: { p: LinePlayerRow }) => (
    <li>
      <button
        type="button"
        onClick={() => onPlayerClick(p)}
        className="flex w-full items-center gap-2 rounded-md py-0.5 text-left text-[10px] text-white/90 transition-colors hover:bg-white/5 active:bg-white/10"
      >
        <span
          className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-[8px] font-mono font-bold text-accent"
          aria-hidden
        >
          {p.num}
        </span>
        <span className="min-w-0 font-semibold uppercase">
          {pitchSurnameLabel(p)}
        </span>
      </button>
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
  const [activePlayer, setActivePlayer] = useState<ProfileModalPlayer | null>(
    null,
  );
  const homePlaced = placeTeamOnPitch(homeSquad.starters, true, homeKitColor);
  const awayPlaced = placeTeamOnPitch(awaySquad.starters, false, awayKitColor);
  const homeFormation = formationLabelFromStarters(homeSquad.starters);
  const awayFormation = formationLabelFromStarters(awaySquad.starters);

  return (
    <div className="w-full">
      <div className="no-scrollbar -mx-3 overflow-x-auto pb-1 sm:-mx-4">
        <div className="relative mx-3 sm:mx-4" style={{ width: PITCH_WIDTH }}>
          <PitchHeaderBar
            home={home}
            away={away}
            homeFormation={homeFormation}
            awayFormation={awayFormation}
          />
          <div
            className="relative overflow-hidden rounded-b-xl border border-t-0 border-gray-300 bg-[#f6f7f9]"
            style={{ height: PITCH_HEIGHT }}
          >
            <PitchMarkings />
            {homePlaced.map((pl) => (
              <PlayerChip
                key={`h-${pl.id}`}
                num={pl.num}
                surname={pitchSurnameLabel(pl)}
                photoUrl={pl.photoUrl}
                top={pl.top}
                left={pl.left}
                kitColor={pl.kitColor}
                onClick={() => setActivePlayer(toProfilePlayer(pl, home.shortName))}
              />
            ))}
            {awayPlaced.map((pl) => (
              <PlayerChip
                key={`a-${pl.id}`}
                num={pl.num}
                surname={pitchSurnameLabel(pl)}
                photoUrl={pl.photoUrl}
                top={pl.top}
                left={pl.left}
                kitColor={pl.kitColor}
                onClick={() => setActivePlayer(toProfilePlayer(pl, away.shortName))}
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
          onPlayerClick={(p) => setActivePlayer(toProfilePlayer(p, home.shortName))}
        />
        <SquadListColumn
          blockLabel="Гости"
          teamName={away.shortName}
          block={awaySquad}
          onPlayerClick={(p) => setActivePlayer(toProfilePlayer(p, away.shortName))}
        />
      </div>

      <PlayerProfileModal
        player={activePlayer}
        onClose={() => setActivePlayer(null)}
      />
    </div>
  );
}
