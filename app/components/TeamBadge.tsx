"use client";

import Image from "next/image";
import { useState } from "react";
import type { Team } from "@/lib/types";

type Props = {
  team: Team;
  size?: "sm" | "md" | "lg" | "xl";
  logoVariant?: "default" | "standings";
};

/** Display sizes in CSS px — под размер контейнера (sm таблица, md календарь, lg лайв). */
const LOGO_PX: Record<NonNullable<Props["size"]>, number> = {
  sm: 32,
  md: 48,
  lg: 56,
  xl: 72,
};

const WRAP: Record<NonNullable<Props["size"]>, { box: string; text: string }> = {
  sm: { box: "h-8 w-8", text: "text-[11px]" },
  md: { box: "h-12 w-12", text: "text-[13px]" },
  lg: { box: "h-14 w-14", text: "text-[15px]" },
  xl: { box: "h-[4.5rem] w-[4.5rem]", text: "text-[17px]" },
};

/** Логотип клуба в спокойном круге `surface-2`; без логотипа — инициалы. */
export default function TeamBadge({ team, size = "md", logoVariant = "default" }: Props) {
  const s = WRAP[size];
  const isStandingsStyle = logoVariant === "standings";
  const initials = isStandingsStyle
    ? team.shortName.replace(/\s+/g, "").slice(0, 2)
    : team.shortName.slice(0, 3);
  const px = LOGO_PX[size];
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = team.logoUrl && !logoFailed;

  return (
    <div
      className={`${s.box} relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2`}
      aria-label={team.fullName}
    >
      {showLogo ? (
        <Image
          src={team.logoUrl}
          alt=""
          width={px}
          height={px}
          className="h-[80%] w-[80%] object-contain"
          sizes={`${px}px`}
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span className={`${s.text} font-semibold leading-none text-muted`}>{initials}</span>
      )}
    </div>
  );
}
