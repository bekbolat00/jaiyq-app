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

const WRAP: Record<NonNullable<Props["size"]>, { box: string; mono: string; ring: string }> = {
  sm: { box: "h-8 w-8", mono: "text-[10px]", ring: "border" },
  md: { box: "h-12 w-12", mono: "text-xs", ring: "border" },
  lg: { box: "h-14 w-14", mono: "text-sm", ring: "border-2" },
  xl: { box: "h-[4.5rem] w-[4.5rem]", mono: "text-sm", ring: "border-2" },
};

export default function TeamBadge({ team, size = "md", logoVariant = "default" }: Props) {
  const s = WRAP[size];
  const isStandingsStyle = logoVariant === "standings";
  const initials = isStandingsStyle
    ? team.shortName.replace(/\s+/g, "").slice(0, 2)
    : team.shortName.slice(0, 3);
  const px = LOGO_PX[size];
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = team.logoUrl && !logoFailed;
  const useStandingsFallback = isStandingsStyle && !showLogo;

  return (
    <div
      className={`${s.box} ${s.ring} relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-white/10 ${
        useStandingsFallback
          ? "bg-white/10"
          : "bg-gradient-to-br from-white/10 to-white/[0.02]"
      } ${
        useStandingsFallback ? "font-sans" : "font-mono " + s.mono
      } font-bold tracking-wider text-foreground shadow-inner`}
      aria-label={team.fullName}
    >
      {showLogo ? (
        <Image
          src={team.logoUrl}
          alt=""
          width={px}
          height={px}
          className="h-full w-full object-contain p-0.5"
          sizes={`${px}px`}
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span
          className={`leading-none ${
            useStandingsFallback
              ? "px-0.5 text-center text-xs font-bold"
              : s.mono
          }`}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
