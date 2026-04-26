"use client";

import { motion } from "framer-motion";
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

function zhaiyqPerspectiveScore(ticket: Ticket) {
  const score = ticket.finalScore;
  if (!score) return null;
  const atHome = ticket.zhaiyqPlayedHome !== false;
  const z = atHome ? score.home : score.away;
  const o = atHome ? score.away : score.home;
  return { zhaiyq: z, opponent: o };
}

function matchSideLabels(ticket: Ticket) {
  const atHome = ticket.zhaiyqPlayedHome !== false;
  return {
    homeLabel: atHome ? "Жайык" : ticket.opponent,
    awayLabel: atHome ? ticket.opponent : "Жайык",
  };
}

function formatGoalsStat(ticket: Ticket) {
  if (!ticket.goals?.length) return null;
  const { homeLabel, awayLabel } = matchSideLabels(ticket);
  return ticket.goals
    .map((g) => {
      const side = g.team === "home" ? homeLabel : awayLabel;
      return `${g.scorer}, ${side}, ${g.minute}′`;
    })
    .join(" · ");
}

export default function DigitalTicket({ ticket }: Props) {
  const isActive = ticket.status === "active";

  const backgroundStyle = ticket.backgroundUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(2,4,8,0.6) 0%, rgba(2,4,8,0.94) 100%), url(${ticket.backgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background:
          "linear-gradient(180deg, rgba(12,22,40,0.92) 0%, rgba(2,4,8,0.98) 100%)",
      };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-premium relative w-full overflow-hidden rounded-3xl drop-shadow-[0_24px_40px_rgba(0,0,0,0.7)] shadow-[0_30px_80px_-30px_rgba(0,240,255,0.25),0_20px_60px_-30px_rgba(0,0,0,0.95)] ${
        !isActive ? "grayscale-[0.12]" : ""
      }`}
    >
      {/* Left notch */}
      <span
        aria-hidden
        className="absolute left-0 top-1/2 z-20 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#020408]"
      />
      {/* Right notch */}
      <span
        aria-hidden
        className="absolute right-0 top-1/2 z-20 h-7 w-7 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#020408]"
      />

      <div style={backgroundStyle} className="relative">
        {/* Top: meta */}
        <header className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_rgba(0,240,255,0.9)]" />
            <span className="neon-cyan text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
              ФК Жайык
            </span>
          </div>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
              isActive
                ? "neon-cyan border-accent/45 bg-accent/10 text-accent"
                : "border-white/10 bg-white/5 text-muted"
            }`}
          >
            {isActive ? "Активный" : "Архивный"}
          </span>
        </header>

        {/* Middle: opponent + date */}
        <div className="px-5 pb-5 pt-4">
          <p className="text-[11px] uppercase tracking-widest text-muted">Матч</p>
          <h3 className="mt-1 text-[22px] font-bold leading-tight text-foreground">
            Жайык — {ticket.opponent}
          </h3>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-[18px] font-bold leading-none text-foreground drop-shadow-[0_0_12px_rgba(0,240,255,0.25)]">
              {formatDate(ticket.date)}
            </p>
            <span className="neon-cyan text-accent/70">·</span>
            <p className="neon-cyan font-mono text-[18px] font-bold leading-none tabular-nums text-accent">
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
      </div>
    </motion.article>
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
  const s = zhaiyqPerspectiveScore(ticket);
  const goalsLine = formatGoalsStat(ticket);

  return (
    <div className="space-y-4 px-5 py-6">
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
          Итог матча
        </p>
        <p className="mt-2 text-[17px] font-semibold tracking-tight text-white/95">
          {s ? (
            <>
              Жайык{" "}
              <span className="mx-1.5 inline-block font-mono text-[19px] font-bold tabular-nums text-white">
                {s.zhaiyq} : {s.opponent}
              </span>{" "}
              {ticket.opponent}
            </>
          ) : (
            <span className="text-muted">Счёт недоступен</span>
          )}
        </p>
      </div>
      {goalsLine ? (
        <p className="border-t border-white/[0.06] pt-4 text-center text-[11px] font-medium leading-relaxed tracking-wide text-white/60">
          Голы: {goalsLine}
        </p>
      ) : null}
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
