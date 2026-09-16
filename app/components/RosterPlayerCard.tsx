"use client";

import { PlayerCardView } from "@/app/components/PlayerCard";
import type { RosterPlayer } from "@/lib/team/fetchTeamRoster";

type Props = {
  player: RosterPlayer;
  onClick?: (player: RosterPlayer) => void;
};

/**
 * Игрок основного состава из Supabase — тот же макет, что и у `PlayerCard`,
 * с реальной вырезкой фото KFF (прозрачный фон).
 */
export default function RosterPlayerCard({ player, onClick }: Props) {
  return (
    <PlayerCardView
      firstName={player.firstName}
      surname={player.surname}
      number={player.number}
      position={player.position}
      photoUrl={player.photoUrl}
      onClick={onClick ? () => onClick(player) : undefined}
    />
  );
}
