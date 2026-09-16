"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { ChevronDown, CircleCheck, Clock, Ticket } from "lucide-react";
import { haptic } from "@/lib/telegram/webApp";
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

  return <TicketsDisclosure tickets={tickets} />;
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

/**
 * Билеты свёрнуты в одну строку: сколько активных и ближайший матч.
 * Полные карточки с QR раскрываются по нажатию — профиль не превращается
 * в длинную ленту билетов.
 */
function TicketsDisclosure({ tickets }: { tickets: MyTicket[] }) {
  const [open, setOpen] = useState(false);

  // Сначала то, что пригодится на входе: оплаченные, потом ждущие оплаты, потом использованные.
  const order: Record<MyTicket["status"], number> = { paid: 0, pending: 1, used: 2 };
  const sorted = [...tickets].sort(
    (a, b) => order[a.status] - order[b.status] || a.matchDate.localeCompare(b.matchDate),
  );
  const active = sorted.filter((t) => t.status !== "used");
  const next = active[0] ?? null;

  const summary = active.length
    ? `${active.length} ${plural(active.length, "активный билет", "активных билета", "активных билетов")}`
    : `${tickets.length} ${plural(tickets.length, "билет", "билета", "билетов")} в архиве`;

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => {
          haptic.select();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent">
          <Ticket className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="t-body block font-medium text-foreground">{summary}</span>
          <span className="t-caption block truncate text-muted">
            {next ? `Ближайший: ${matchTitle(next)} · ${formatDate(next.matchDate)}` : "Нажмите, чтобы посмотреть"}
          </span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-subtle">
          <ChevronDown className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="tickets"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-t border-line p-3">
              {sorted.map((t, i) => (
                <TicketCard key={t.id} ticket={t} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
