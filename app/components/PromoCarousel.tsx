import Link from "next/link";

const CARDS = [
  {
    href: "https://tickets.example.kz",
    title: "Матч тура",
    subtitle: "Жайык — билеты и трибуны",
    cta: "Купить билет",
    external: true,
  },
  {
    href: "/shop",
    title: "Новая коллекция мерча",
    subtitle: "Сезон 25/26 уже в магазине",
    cta: "В каталог",
    external: false,
  },
  {
    href: "/academy",
    title: "Набор в академию",
    subtitle: "Покажи себя селекционерам клуба",
    cta: "Подробнее",
    external: false,
  },
] as const;

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
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
        {subtitle}
      </p>
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

export default function PromoCarousel() {
  return (
    <div className="-mx-4">
      <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
        {CARDS.map((card, index) => {
          const shell = (
            <article
              className="relative min-h-[168px] w-[min(88vw,400px)] shrink-0 snap-center overflow-hidden rounded-3xl border border-white/[0.08] bg-[#020408] shadow-[0_24px_70px_-28px_rgba(0,0,0,0.92)]"
              style={{ backgroundColor: "#020408" }}
            >
              {/* Мягкие «обложечные» градиенты */}
              <div
                className="pointer-events-none absolute -right-8 -top-16 h-52 w-52 rounded-full opacity-50 blur-[48px]"
                style={{
                  background:
                    index === 0
                      ? "radial-gradient(circle, rgba(34,211,238,0.22) 0%, transparent 70%)"
                      : index === 1
                        ? "radial-gradient(circle, rgba(56,189,248,0.18) 0%, rgba(30,58,138,0.2) 45%, transparent 72%)"
                        : "radial-gradient(circle, rgba(6,182,212,0.2) 0%, rgba(15,23,42,0.35) 55%, transparent 70%)",
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
                <CardInner title={card.title} subtitle={card.subtitle} cta={card.cta} />
              </div>
            </article>
          );

          if (card.external) {
            return (
              <a
                key={card.title}
                href={card.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block shrink-0 transition-transform active:scale-[0.99]"
              >
                {shell}
              </a>
            );
          }
          return (
            <Link
              key={card.title}
              href={card.href}
              className="block shrink-0 transition-transform active:scale-[0.99]"
            >
              {shell}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
