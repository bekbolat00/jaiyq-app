"use client";

import type { Ticket } from "@/lib/types";
import QrCode from "./QrCode";

type Props = {
  ticket: Ticket;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DigitalTicket({ ticket }: Props) {
  const isActive = ticket.status === "active";

  const backgroundStyle = ticket.backgroundUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(11,19,43,0.55) 0%, rgba(11,19,43,0.92) 100%), url(${ticket.backgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background:
          "linear-gradient(180deg, rgba(28,40,88,0.9) 0%, rgba(11,19,43,0.98) 100%)",
      };

  return (
    <article
      className={`glass-premium relative w-full overflow-hidden rounded-3xl drop-shadow-[0_24px_40px_rgba(0,0,0,0.7)] shadow-[0_30px_80px_-30px_rgba(0,240,255,0.25),0_20px_60px_-30px_rgba(0,0,0,0.95)] ${
        !isActive ? "grayscale-[0.15]" : ""
      }`}
    >
      {/* Left notch */}
      <span
        aria-hidden
        className="absolute left-0 top-1/2 z-20 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#060A14]"
      />
      {/* Right notch */}
      <span
        aria-hidden
        className="absolute right-0 top-1/2 z-20 h-7 w-7 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#060A14]"
      />

      <div style={backgroundStyle} className="relative">
        {/* Top: meta */}
        <header className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_rgba(0,240,255,0.9)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
              ФК Жайык
            </span>
          </div>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
              isActive
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-white/10 bg-white/5 text-muted"
            }`}
          >
            {isActive ? "Активный" : "Архивный"}
          </span>
        </header>

        {/* Middle: opponent + date */}
        <div className="px-5 pb-5 pt-4">
          <p className="text-[11px] uppercase tracking-widest text-muted">Матч</p>
          <h3 className="mt-1 text-[22px] font-semibold leading-tight text-foreground">
            Жайык — {ticket.opponent}
          </h3>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-[18px] font-bold leading-none text-foreground drop-shadow-[0_0_12px_rgba(0,240,255,0.25)]">
              {formatDate(ticket.date)}
            </p>
            <span className="text-accent/70">·</span>
            <p className="font-mono text-[18px] font-bold leading-none tabular-nums text-accent drop-shadow-[0_0_14px_rgba(0,240,255,0.55)]">
              {formatTime(ticket.date)}
            </p>
          </div>
        </div>

        {/* Perforated divider */}
        <div className="relative h-px">
          <div className="mx-6 h-px border-t border-dashed border-white/15" />
        </div>

        {/* Bottom: body changes by state */}
        {isActive ? (
          <ActiveBody ticket={ticket} />
        ) : (
          <ArchivedBody ticket={ticket} />
        )}

        {/* Diagonal stamp for archived tickets */}
        {!isActive && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
          >
            <span className="ticket-stamp text-[22px] sm:text-[26px]">
              Матч окончен
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

function ActiveBody({ ticket }: { ticket: Ticket }) {
  return (
    <div className="flex items-center gap-4 px-5 py-5">
      <div className="flex-1 space-y-2">
        <Row label="Сектор" value={ticket.sector} />
        <Row label="Ряд" value={ticket.row} />
        <Row label="Место" value={ticket.seat} />
      </div>
      <div>
        <QrCode value={ticket.qrPayload} size={140} />
        <p className="mt-1 text-center text-[10px] uppercase tracking-widest text-muted">
          Покажите на входе
        </p>
      </div>
    </div>
  );
}

function ArchivedBody({ ticket }: { ticket: Ticket }) {
  const score = ticket.finalScore;
  return (
    <div className="px-5 py-5">
      <div className="flex items-center justify-center gap-5">
        <span className="text-[13px] font-medium text-foreground">Жайык</span>
        <span className="font-mono text-3xl font-bold text-accent tabular-nums">
          {score ? `${score.home} : ${score.away}` : "— : —"}
        </span>
        <span className="text-[13px] font-medium text-foreground">
          {ticket.opponent}
        </span>
      </div>

      {ticket.goals && ticket.goals.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <p className="text-[11px] uppercase tracking-widest text-muted">
            Авторы голов
          </p>
          <ul className="divide-y divide-white/5 rounded-xl border border-white/5 bg-white/[0.02]">
            {ticket.goals.map((g, i) => (
              <li
                key={i}
                className="flex items-center justify-between px-3 py-2 text-[13px]"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      g.team === "home" ? "bg-accent" : "bg-white/50"
                    }`}
                  />
                  <span className="text-foreground">{g.scorer}</span>
                </span>
                <span className="font-mono text-muted">{g.minute}&apos;</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.04] pb-1.5 last:border-none">
      <span className="text-[11px] uppercase tracking-widest text-muted">
        {label}
      </span>
      <span className="font-mono text-[16px] font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}
