import Link from "next/link";

type Props = {
  title?: string;
  subtitle?: string;
  href?: string;
};

export default function TalentBanner({
  title = "ФК Жайык ищет таланты!",
  subtitle = "Открыт набор в академию",
  href = "/academy",
}: Props) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-[#00f0ff] via-[#0bd3ff] to-[#0086ff] p-[1px] shadow-[0_18px_50px_-18px_rgba(0,240,255,0.55)] transition-transform active:scale-[0.99]"
    >
      <div className="relative flex items-center justify-between gap-4 rounded-[23px] bg-gradient-to-br from-[#00f0ff] via-[#0bd3ff] to-[#0086ff] px-5 py-4 text-[#052026]">
        <div className="absolute inset-y-0 right-0 w-1/2 opacity-30 mix-blend-overlay">
          <svg viewBox="0 0 200 120" className="h-full w-full">
            <defs>
              <radialGradient id="tb" cx="80%" cy="30%" r="80%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="200" height="120" fill="url(#tb)" />
          </svg>
        </div>

        <div className="relative flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">
            Академия
          </p>
          <h3 className="mt-1 text-[17px] font-semibold leading-tight">
            {title}
          </h3>
          <p className="mt-0.5 text-[13px] opacity-90">{subtitle}</p>
        </div>

        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#04111a] text-accent transition-transform group-hover:translate-x-0.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
