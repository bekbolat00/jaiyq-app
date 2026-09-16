import Link from "next/link";
import { ChevronRight, GraduationCap } from "lucide-react";
import BrandWaves from "@/app/components/ui/BrandWaves";

type Props = {
  title?: string;
  subtitle?: string;
  href?: string;
};

/** Приглашение в академию: фирменный синий блок с волнами герба. */
export default function TalentBanner({
  title = "ФК Жайык ищет таланты",
  subtitle = "Открыт набор в академию",
  href = "/academy",
}: Props) {
  return (
    <Link
      href={href}
      className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-line bg-navy p-4 transition-transform duration-150 ease-out active:scale-[0.98]"
    >
      <BrandWaves
        className="absolute -right-8 bottom-0 h-20 w-3/5"
        opacity={0.2}
      />

      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background/40 text-accent">
        <GraduationCap className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>

      <span className="relative min-w-0 flex-1">
        <span className="t-label block text-accent">Академия</span>
        <span className="t-h3 mt-1 block text-foreground">{title}</span>
        <span className="t-small mt-0.5 block text-muted">{subtitle}</span>
      </span>

      <ChevronRight className="relative h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
    </Link>
  );
}
