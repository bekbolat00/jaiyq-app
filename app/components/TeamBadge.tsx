import type { Team } from "@/lib/types";

type Props = {
  team: Team;
  size?: "sm" | "md" | "lg";
};

const SIZES: Record<NonNullable<Props["size"]>, { wrap: string; mono: string; ring: string }> = {
  sm: { wrap: "h-10 w-10", mono: "text-sm", ring: "border" },
  md: { wrap: "h-16 w-16", mono: "text-lg", ring: "border" },
  lg: { wrap: "h-20 w-20", mono: "text-xl", ring: "border-2" },
};

export default function TeamBadge({ team, size = "md" }: Props) {
  const s = SIZES[size];
  const initials = team.shortName.slice(0, 3);
  return (
    <div
      className={`${s.wrap} ${s.ring} flex items-center justify-center rounded-full border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] font-mono ${s.mono} font-bold tracking-wider text-foreground shadow-inner`}
      aria-label={team.fullName}
    >
      {initials}
    </div>
  );
}
