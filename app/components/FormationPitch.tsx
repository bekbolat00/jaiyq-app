"use client";

import { displayCase } from "@/lib/text/displayCase";
import { Users } from "lucide-react";
import { useState } from "react";
import {
  surnameFromDisplayLabel,
  type LineBlock,
  type LinePlayerRow,
} from "@/lib/matches/matchDetailFromDb";
import { formationLabelFromStarters } from "@/lib/matches/formationLayout";
import { positionFullLabel } from "@/lib/players/position";
import PlayerProfileModal, {
  type ProfileModalPlayer,
} from "@/app/components/PlayerProfileModal";
import EmptyState from "@/app/components/ui/EmptyState";
import Tabs from "@/app/components/ui/Tabs";
import type { Team } from "@/lib/types";

type PitchPlaced = LinePlayerRow & {
  top: string;
  left: string;
};


function pitchSurnameLabel(p: LinePlayerRow): string {
  return displayCase(p.surname || surnameFromDisplayLabel(p.name));
}

function initialsOf(p: LinePlayerRow): string {
  const a = pitchSurnameLabel(p).charAt(0);
  const b = (p.firstName ?? "").trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "—";
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

/**
 * Линия на схеме (0=вратарь .. 3=нападающий) по позиции игрока.
 * Нормализует вход регуляркой вместо точного словаря — реальные значения
 * встречаются и как «вр/зщ/пз/нп», и как полные слова/английские коды,
 * если что-то не прошло через маппинг скрапера.
 */
function normalizePosColumn(raw: string): 0 | 1 | 2 | 3 {
  const p = raw.toLowerCase().replace(/[^a-zа-яё]/g, "");
  if (/^(вр|врат|gk|кипер|goal)/.test(p)) return 0;
  if (/^(зщ|защ|cb|lb|rb|wb|lwb|rwb|def)/.test(p)) return 1;
  if (/^(пз|полуз|cm|cdm|cam|dm|am|lm|rm|mid)/.test(p)) return 2;
  return 3;
}

function pitchPosKey(p: LinePlayerRow): string {
  return (
    p.pos ??
    (p as LinePlayerRow & { position?: string }).position ??
    ""
  ).trim();
}

function shirtNumber(p: LinePlayerRow): number {
  const n = Number.parseInt(String(p.num).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 999;
}

/** Высота/ширина поля: вертикальная схема одной команды на всю ширину. */
const PITCH_ASPECT = "4 / 5";

/** `top` в % для линии: вратарь у нижних ворот, нападающие у центра поля сверху. */
const TOP_BY_LINE = [86, 64, 40, 16] as const;

/**
 * Вертикальная схема одной команды: линии снизу вверх (вратарь → нападающие),
 * игроки внутри линии равномерно по ширине.
 */
function placeTeamOnPitch(players: LinePlayerRow[]): PitchPlaced[] {
  const fieldPlayers = players.filter((p) => {
    const pos = pitchPosKey(p).toLowerCase();
    return !pos.includes("тренер");
  });
  const lines: Record<number, LinePlayerRow[]> = { 0: [], 1: [], 2: [], 3: [] };
  for (const p of fieldPlayers) {
    lines[normalizePosColumn(pitchPosKey(p))].push(p);
  }

  const result: PitchPlaced[] = [];
  for (const lineIdx of [0, 1, 2, 3]) {
    // Явно сортируем по номеру формы — порядок из БД/заявки не гарантирует
    // ничего про расположение на поле, а так хотя бы детерминированно.
    const group = [...lines[lineIdx]].sort((a, b) => shirtNumber(a) - shirtNumber(b));
    if (!group.length) continue;
    const top = TOP_BY_LINE[lineIdx]!;
    group.forEach((p, i) => {
      const left = ((i + 0.5) / group.length) * 100;
      result.push({ ...p, top: `${top}%`, left: `${left}%` });
    });
  }
  return result;
}

function Avatar({ player, size }: { player: LinePlayerRow; size: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2"
      style={{ width: size, height: size }}
    >
      {player.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote/local player photo URLs
        <img src={player.photoUrl} alt="" className="h-full w-full object-cover object-top" />
      ) : (
        <span className="t-caption text-muted">{initialsOf(player)}</span>
      )}
    </span>
  );
}

function PlayerChip({ player, onClick }: { player: PitchPlaced; onClick: () => void }) {
  const surname = pitchSurnameLabel(player);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${player.num} ${surname}`}
      className="absolute flex w-[68px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition-transform duration-100 active:scale-95"
      style={{ top: player.top, left: player.left }}
    >
      <span className="rounded-full ring-1 ring-line-strong">
        <Avatar player={player} size={36} />
      </span>
      <span className="t-caption flex max-w-full items-baseline gap-1 text-foreground">
        <span className="shrink-0 tabular-nums text-subtle">{player.num}</span>
        <span className="truncate">{surname}</span>
      </span>
    </button>
  );
}

function PitchMarkings() {
  return (
    <div className="pointer-events-none absolute inset-3 overflow-hidden rounded-lg border border-line" aria-hidden>
      {/* Центральный круг на верхней кромке (линия середины поля). */}
      <div className="absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line" />
      {/* Штрафная и вратарская у нижних ворот. */}
      <div className="absolute bottom-0 left-[20%] right-[20%] h-[18%] border-x border-t border-line" />
      <div className="absolute bottom-0 left-[36%] right-[36%] h-[7%] border-x border-t border-line" />
    </div>
  );
}

function SquadGroup({
  title,
  players,
  onPlayerClick,
}: {
  title: string;
  players: LinePlayerRow[];
  onPlayerClick: (p: LinePlayerRow) => void;
}) {
  if (!players.length) return null;
  return (
    <section>
      <h3 className="t-h3 mb-3 text-foreground">{title}</h3>
      <ul className="card divide-y divide-line overflow-hidden">
        {players.map((p) => {
          const position = positionFullLabel(pitchPosKey(p));
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPlayerClick(p)}
                className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-surface-2"
              >
                <span className="t-small w-6 shrink-0 text-right tabular-nums text-subtle">{p.num}</span>
                <Avatar player={p} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="t-body block truncate text-foreground">{pitchSurnameLabel(p)}</span>
                  {position ? <span className="t-caption block truncate text-muted">{position}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
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

type Side = "home" | "away";

function isZhaiyq(team: Team): boolean {
  return /жайык|zhaiyq/i.test(`${team.id} ${team.shortName} ${team.fullName}`);
}

export default function FormationPitch({ home, away, homeSquad, awaySquad }: FormationPitchProps) {
  const [activePlayer, setActivePlayer] = useState<ProfileModalPlayer | null>(null);
  const [side, setSide] = useState<Side>(() =>
    isZhaiyq(away) && !isZhaiyq(home) && awaySquad.starters.length > 0 ? "away" : "home",
  );

  const team = side === "home" ? home : away;
  const squad = side === "home" ? homeSquad : awaySquad;
  const placed = placeTeamOnPitch(squad.starters);
  const formation = formationLabelFromStarters(squad.starters);
  const openPlayer = (p: LinePlayerRow) => setActivePlayer(toProfilePlayer(p, displayCase(team.shortName)));
  const isEmpty = !squad.starters.length && !squad.bench.length && !squad.coaches.length;

  return (
    <div className="w-full">
      <Tabs
        layoutId="formation-team"
        value={side}
        onChange={setSide}
        tabs={[
          { id: "home", label: displayCase(home.shortName) },
          { id: "away", label: displayCase(away.shortName) },
        ]}
      />

      {isEmpty ? (
        <EmptyState
          icon={<Users className="h-6 w-6" strokeWidth={1.75} />}
          title="Состав пока не опубликован"
          description="Заявка появится ближе к началу матча"
        />
      ) : (
        <div className="mt-4 flex flex-col gap-8">
          {placed.length ? (
            <div
              className="relative w-full overflow-hidden rounded-2xl border border-line bg-navy/40"
              style={{ aspectRatio: PITCH_ASPECT }}
            >
              <PitchMarkings />
              {formation ? (
                <span className="t-caption absolute left-5 top-4 tabular-nums text-muted">{formation}</span>
              ) : null}
              {placed.map((pl) => (
                <PlayerChip key={pl.id} player={pl} onClick={() => openPlayer(pl)} />
              ))}
            </div>
          ) : null}

          <SquadGroup title="Основной состав" players={squad.starters} onPlayerClick={openPlayer} />
          <SquadGroup title="Запасные" players={squad.bench} onPlayerClick={openPlayer} />
          <SquadGroup title="Тренерский штаб" players={squad.coaches} onPlayerClick={openPlayer} />
        </div>
      )}

      <PlayerProfileModal player={activePlayer} onClose={() => setActivePlayer(null)} />
    </div>
  );
}
