"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { getTelegramInitData } from "@/lib/telegram/getInitData";
import type { MyTicket } from "@/lib/types";

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function matchTitle(t: MyTicket) {
  return t.isHome ? `Жайык — ${t.opponent}` : `${t.opponent} — Жайык`;
}

function StatusBadge({ status }: { status: MyTicket["status"] }) {
  const map = {
    paid: { label: "Оплачен", cls: "neon-cyan border-accent/45 bg-accent/10 text-accent" },
    pending: { label: "Ждёт оплаты", cls: "border-orange-400/40 bg-orange-400/10 text-orange-300" },
    used: { label: "Использован", cls: "border-white/10 bg-white/5 text-muted" },
  } as const;
  const s = map[status];
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${s.cls}`}>
      {s.label}
    </span>
  );
}

function TicketCard({ ticket }: { ticket: MyTicket }) {
  const isUsed = ticket.status === "used";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-premium relative w-full overflow-hidden rounded-3xl shadow-[0_30px_80px_-30px_rgba(0,240,255,0.25),0_20px_60px_-30px_rgba(0,0,0,0.95)] ${
        isUsed ? "grayscale" : ""
      }`}
    >
      <span aria-hidden className="absolute left-0 top-1/2 z-20 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#020408]" />
      <span aria-hidden className="absolute right-0 top-1/2 z-20 h-7 w-7 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#020408]" />

      <header className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_rgba(0,240,255,0.9)]" />
          <span className="neon-cyan text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
            ФК Жайык
          </span>
        </div>
        <StatusBadge status={ticket.status} />
      </header>

      <div className="px-5 pb-5 pt-4">
        <p className="text-[11px] uppercase tracking-widest text-muted">Матч</p>
        <h3 className="mt-1 text-[20px] font-bold leading-tight text-foreground">
          {matchTitle(ticket)}
        </h3>
        <p className="mt-2 text-[15px] font-bold leading-none text-foreground/90">
          {formatDate(ticket.matchDate)}
        </p>
      </div>

      <div className="relative h-px">
        <div className="mx-6 h-px border-t border-dashed border-white/15" />
      </div>

      {isUsed ? (
        <div className="flex flex-col items-center gap-2 px-5 py-8">
          <div className="flex h-[168px] w-[168px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-10 w-10 text-white/35" aria-hidden>
              <rect x="4" y="10.5" width="16" height="10" rx="2" />
              <path d="M8 10.5V7a4 4 0 1 1 8 0v3.5" />
            </svg>
            <p className="text-[13px] font-black uppercase tracking-wide text-white/60">
              Билет использован
            </p>
          </div>
          {ticket.scannedAt ? (
            <p className="text-center text-[11px] font-medium text-muted">
              Вход: {formatDateTime(ticket.scannedAt)}
            </p>
          ) : null}
        </div>
      ) : ticket.status === "paid" && ticket.qrHash ? (
        <div className="flex flex-col items-center gap-2 px-5 py-6">
          <div className="rounded-2xl bg-white p-3 shadow-[0_0_0_1px_rgba(0,240,255,0.45),0_0_32px_-2px_rgba(0,240,255,0.55)]">
            <QRCodeSVG value={ticket.qrHash} size={168} level="M" marginSize={0} />
          </div>
          <p className="text-center text-[10px] uppercase tracking-widest text-muted">
            Покажите на входе
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
          <p className="text-[13px] font-bold text-orange-300">Ожидает оплаты</p>
          <p className="max-w-[240px] text-[11px] leading-relaxed text-muted">
            Завершите оплату в Kaspi и нажмите «Я оплатил» — после этого появится QR-код.
          </p>
        </div>
      )}
    </motion.article>
  );
}

const NO_TELEGRAM = "Откройте приложение через Telegram, чтобы увидеть билеты.";

export default function MyTicketsSection() {
  // Наличие Telegram-сессии известно ещё до запроса, поэтому этот случай
  // задаём начальным состоянием, а не setState внутри эффекта.
  const [hasTelegram] = useState(() => Boolean(getTelegramInitData()));
  const [tickets, setTickets] = useState<MyTicket[] | null>(hasTelegram ? null : []);
  const [error, setError] = useState<string | null>(hasTelegram ? null : NO_TELEGRAM);

  // Загрузка ничего не пишет в состояние — только возвращает результат,
  // а setState живёт в колбэке эффекта.
  const load = useCallback(async (): Promise<
    { tickets: MyTicket[] } | { error: string }
  > => {
    const initData = getTelegramInitData();
    if (!initData) return { error: NO_TELEGRAM };
    try {
      const res = await fetch("/api/tickets/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });
      const json = (await res.json()) as { tickets?: MyTicket[] };
      if (!res.ok) return { error: "Не удалось загрузить билеты." };
      return { tickets: json.tickets ?? [] };
    } catch (e: unknown) {
      console.error("[MyTicketsSection] load threw:", e);
      return { error: "Не удалось загрузить билеты." };
    }
  }, []);

  useEffect(() => {
    if (!hasTelegram) return;
    let cancelled = false;
    void load().then((res) => {
      if (cancelled) return;
      if ("error" in res) {
        setError(res.error);
        setTickets([]);
        return;
      }
      setTickets(res.tickets);
    });
    return () => {
      cancelled = true;
    };
  }, [hasTelegram, load]);

  if (tickets === null) {
    return (
      <div className="glass-premium rounded-2xl p-6 text-center text-[13px] text-muted">
        Загружаем билеты…
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-premium rounded-2xl p-6 text-center text-[13px] text-muted">
        {error}
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div className="glass-premium rounded-2xl p-6 text-center text-[13px] text-muted">
        Билетов пока нет.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {tickets.map((t) => (
        <TicketCard key={t.id} ticket={t} />
      ))}
    </div>
  );
}
