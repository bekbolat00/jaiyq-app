"use client";

/* eslint-disable @next/next/no-img-element -- вырезки игроков с разных доменов (KFF/Supabase), next/image тут не помогает */

import { motion } from "framer-motion";
import { useState } from "react";
import type { Player } from "@/lib/types";
import { positionFullLabel } from "@/lib/players/position";

type Props = {
  player: Player;
  onClick?: (player: Player) => void;
};

/** Карточка игрока академии/моков — тот же макет, что и у состава из Supabase. */
export default function PlayerCard({ player, onClick }: Props) {
  return (
    <PlayerCardView
      firstName={player.firstName}
      surname={player.lastName}
      number={String(player.number)}
      position={player.position}
      photoUrl={player.photoUrl}
      onClick={() => onClick?.(player)}
    />
  );
}

export type PlayerCardViewProps = {
  firstName: string;
  surname: string;
  /** Номер без решётки; `"—"` или пусто — номера нет. */
  number: string;
  /** Код (`вр`/`зщ`/`пз`/`нп`) или готовое слово. */
  position: string;
  photoUrl: string | null | undefined;
  onClick?: () => void;
};

export function playerInitials(firstName: string, surname: string): string {
  const letters = [firstName, surname]
    .map((s) => s.trim().charAt(0))
    .filter(Boolean)
    .join("");
  return letters.toUpperCase() || "—";
}

/**
 * Карточка игрока: вырезка фото выходит за верхний край карточки,
 * внизу — имя, фамилия и строка «#21 · Вратарь».
 */
export function PlayerCardView({
  firstName,
  surname,
  number,
  position,
  photoUrl,
  onClick,
}: PlayerCardViewProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = photoUrl?.trim() || null;
  const showPhoto = src != null && failedSrc !== src;

  const hasNumber = number.trim() !== "" && number !== "—";
  const positionLabel = position ? positionFullLabel(position) : "";
  const meta = [hasNumber ? `#${number}` : null, positionLabel || null]
    .filter(Boolean)
    .join(" · ");

  const label = [firstName, surname, meta].filter(Boolean).join(", ");
  const shared = {
    whileTap: { scale: 0.98 },
    transition: { duration: 0.12, ease: "easeOut" as const },
    className:
      "relative mt-6 block aspect-[4/5] w-full select-none rounded-2xl border border-line bg-surface text-left transition-colors duration-150 active:border-line-strong",
  };

  const content = (
    <>
      {/* Фото поднято над карточкой: голова выходит за верхний край. */}
      <span aria-hidden className="absolute inset-x-0 -top-6 bottom-[72px] flex justify-center">
        {showPhoto ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailedSrc(src)}
            className="h-full w-auto max-w-full object-contain object-bottom"
          />
        ) : (
          <span className="mt-10 flex h-24 w-24 items-center justify-center rounded-full bg-navy/40">
            <span className="text-[32px] font-semibold leading-none tracking-[-0.02em] text-accent/70">
              {playerInitials(firstName, surname)}
            </span>
          </span>
        )}
      </span>

      {/* Низ: фото растворяется в поверхности, поверх — лёгкий фирменный синий. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] rounded-b-2xl bg-gradient-to-t from-surface from-35% via-surface/85 to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] rounded-b-2xl bg-gradient-to-t from-navy/30 to-transparent"
      />

      <span className="absolute inset-x-0 bottom-0 flex flex-col px-3 pb-3">
        {firstName && <span className="t-small truncate text-muted">{firstName}</span>}
        <span className="t-h3 truncate text-foreground">{surname}</span>
        {meta && <span className="t-caption mt-1 truncate tabular-nums text-subtle">{meta}</span>}
      </span>
    </>
  );

  if (!onClick) {
    return (
      <motion.div role="group" aria-label={label} {...shared}>
        {content}
      </motion.div>
    );
  }

  return (
    <motion.button type="button" onClick={onClick} aria-label={label} {...shared}>
      {content}
    </motion.button>
  );
}
