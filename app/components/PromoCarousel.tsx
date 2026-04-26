const MATCH_TOUR_CARD = {
  href: "https://tickets.example.kz",
  title: "Матч тура",
  subtitle: "Жайык — билеты и трибуны",
  cta: "Купить билет",
} as const;

function CardInner({
  title,
  subtitle,
  cta,
}: {
  title: string;
  subtitle: string;
  cta: string;
}) {
  return (
    <div
      className="relative z-10 flex min-h-[132px] flex-col justify-end rounded-[20px] border border-white/[0.09] p-5"
      style={{
        background:
          "linear-gradient(165deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.03) 100%), #020408",
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">{subtitle}</p>
      <h3 className="mt-1.5 text-balance text-lg font-black uppercase leading-tight tracking-wide text-white/95">
        {title}
      </h3>
      <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/85">
        {cta}
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 text-white/55"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </span>
    </div>
  );
}

/** Один главный баннер «Матч тура» на главной. */
export default function PromoCarousel() {
  return (
    <div className="-mx-4 px-4">
      <a
        href={MATCH_TOUR_CARD.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block transition-transform active:scale-[0.99]"
      >
        <article
          className="relative min-h-[168px] w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-[#020408] shadow-[0_24px_70px_-28px_rgba(0,0,0,0.92)]"
          style={{ backgroundColor: "#020408" }}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-16 h-52 w-52 rounded-full opacity-50 blur-[48px]"
            style={{
              background: "radial-gradient(circle, rgba(34,211,238,0.22) 0%, transparent 70%)",
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full opacity-45 blur-[56px]"
            style={{
              background:
                "radial-gradient(circle, rgba(30,64,175,0.35) 0%, rgba(2,6,23,0.5) 50%, transparent 70%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#020408]/90 via-[#020408]/25 to-white/[0.04]"
            aria-hidden
          />
          <div className="relative p-1.5">
            <CardInner
              title={MATCH_TOUR_CARD.title}
              subtitle={MATCH_TOUR_CARD.subtitle}
              cta={MATCH_TOUR_CARD.cta}
            />
          </div>
        </article>
      </a>
    </div>
  );
}
