"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { CircleCheck, Clock, Ticket } from "lucide-react";
import EmptyState from "@/app/components/ui/EmptyState";
import { getTelegramInitData } from "@/lib/telegram/getInitData";
import type { MyTicket } from "@/lib/types";

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function matchTitle(t: MyTicket) {
  return t.isHome ? `Жайык — ${t.opponent}` : `${t.opponent} — Жайык`;
}

const STATUS: Record<MyTicket["status"], { label: string; cls: string }> = {
  paid: { label: "Оплачен", cls: "bg-accent/12 text-accent" },
  pending: { label: "Ждёт оплаты", cls: "bg-draw/12 text-draw" },
  used: { label: "Использован", cls: "bg-surface-2 text-subtle" },
};

function StatusBadge({ status }: { status: MyTicket["status"] }) {
  const s = STATUS[status];
  return (
    <span className={`t-caption shrink-0 rounded-lg px-2 py-1 ${s.cls}`}>{s.label}</span>
  );
}

/** Линия отрыва билета: пунктир и два полукруглых выреза цвета фона. */
function Perforation() {
  return (
    <div className="relative h-0" aria-hidden>
      <span className="absolute left-0 top-0 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-background" />
      <span className="absolute right-0 top-0 h-5 w-5 translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-background" />
      <div className="mx-5 border-t border-dashed border-line-strong" />
    </div>
  );
}

function TicketCard({ ticket, index }: { ticket: MyTicket; index: number }) {
  const isUsed = ticket.status === "used";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1], delay: Math.min(index, 5) * 0.04 }}
      className="relative overflow-hidden rounded-2xl border border-line"
    >
      <header className={`px-4 pb-5 pt-4 ${isUsed ? "bg-surface" : "bg-navy"}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="t-caption text-muted">{ticket.competition || "ФК Жайык"}</p>
          <StatusBadge status={ticket.status} />
        </div>
        <h3 className={`t-h3 mt-2 ${isUsed ? "text-muted" : "text-foreground"}`}>
          {matchTitle(ticket)}
        </h3>
        <p className="t-small mt-1 text-muted">{formatDate(ticket.matchDate)}</p>
      </header>

      <Perforation />

      <div className="bg-surface px-4 pb-5 pt-6">
        {isUsed ? (
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-subtle">
              <CircleCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="t-body text-foreground">Билет использован</p>
              {ticket.scannedAt ? (
                <p className="t-caption text-muted">Вход: {formatDateTime(ticket.scannedAt)}</p>
              ) : null}
            </div>
          </div>
        ) : ticket.status === "paid" && ticket.qrHash ? (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-xl bg-white p-3">
              <QRCodeSVG
                value={ticket.qrHash}
                size={184}
                level="M"
                marginSize={0}
              />
            </div>
            <p className="t-caption text-center text-muted">Покажите QR-код на входе</p>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-draw/12 text-draw">
              <Clock className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="t-body text-foreground">Ожидает оплаты</p>
              <p className="t-small mt-0.5 text-muted">
                Завершите оплату в Kaspi и нажмите «Я оплатил» — после этого появится QR-код.
              </p>
            </div>
          </div>
        )}
      </div>
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
      <div className="overflow-hidden rounded-2xl border border-line" aria-busy="true">
        <span className="sr-only">Загружаем билеты…</span>
        <div className="h-[104px] bg-surface-2" />
        <div className="h-[72px] bg-surface" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <EmptyState
          icon={<Ticket className="h-6 w-6" strokeWidth={1.75} aria-hidden />}
          title="Билеты недоступны"
          description={error}
        />
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div className="card">
        <EmptyState
          icon={<Ticket className="h-6 w-6" strokeWidth={1.75} aria-hidden />}
          title="Билетов пока нет"
          description="Купленные билеты появятся здесь вместе с QR-кодом для входа."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {tickets.map((t, i) => (
        <TicketCard key={t.id} ticket={t} index={i} />
      ))}
    </div>
  );
}
