import type { DbMatchRow } from "@/lib/types";

const FALLBACK_TICKET_HREF = "https://tickets.example.kz" as const;

type Props = {
  heroMatch: DbMatchRow | null;
  matchesLoading?: boolean;
};

function heroTitle(row: DbMatchRow): string {
  return row.is_home ? `Жайык — ${row.opponent}` : `${row.opponent} — Жайык`;
}

function CardInner({
  eyebrow,
  title,
  cta,
}: {
  eyebrow: string;
  title: string;
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
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">{eyebrow}</p>
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

/** Главный баннер «Матч тура»: один ближайший предстоящий матч из Supabase. */
export default function PromoCarousel({ heroMatch, matchesLoading }: Props) {
  const ticketHref =
    heroMatch?.ticket_url?.trim() && heroMatch.ticket_url.trim().length > 0
      ? heroMatch.ticket_url.trim()
      : FALLBACK_TICKET_HREF;

  if (matchesLoading) {
    return (
      <div className="-mx-4 px-4">
        <div
          className="relative min-h-[168px] w-full animate-pulse overflow-hidden rounded-3xl border border-white/[0.08] bg-[#020408]"
          aria-busy
          aria-label="Загрузка матча тура"
        />
      </div>
    );
  }

  if (!heroMatch) {
    return (
      <div className="-mx-4 px-4">
        <article
          className="relative min-h-[168px] w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-[#020408] shadow-[0_24px_70px_-28px_rgba(0,0,0,0.92)]"
          style={{ backgroundColor: "#020408" }}
        >
          <div className="relative p-1.5">
            <CardInner
              eyebrow="Матч тура"
              title="Нет запланированных матчей"
              cta="Скоро здесь появится дата"
            />
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="-mx-4 px-4">
      <a
        href={ticketHref}
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
              eyebrow="Матч тура"
              title={heroTitle(heroMatch)}
              cta="Купить билет"
            />
          </div>
        </article>
      </a>
    </div>
  );
}
