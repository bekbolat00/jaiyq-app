"use client";

import { haptic } from "@/lib/telegram/webApp";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import Button from "@/app/components/ui/Button";
import { getTelegramInitData } from "@/lib/telegram/getInitData";
import { formatKickoff } from "@/lib/matches/formatKickoff";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  /** Необязательно: «Жайык — Кайрат», чтобы было видно, на какой матч билет. */
  matchTitle?: string;
  /** Необязательно: `match_date` матча, показывается как «Сб, 4 октября · 16:00». */
  kickoffAt?: string;
};

/** Ссылка на оплату Kaspi (статическая витрина клуба). */
const KASPI_PAY_URL = "https://pay.kaspi.kz/pay/0o2tyjk1";
const TICKET_PRICE = "1 000 ₸";

/**
 * Фирменный красный Kaspi — единственное исключение из палитры клуба:
 * это цвет способа оплаты, а не акцент интерфейса.
 */
const KASPI_RED = "#F14635";

/** pick — выбор билета, pay — оплата в Kaspi, done — заявка подтверждена. */
type Step = "pick" | "pay" | "done";

const EASE = [0.2, 0.8, 0.2, 1] as const;

const stepMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

function KaspiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#fff" />
      <path
        d="M8 7h2.6c2.1 0 3.4 1.05 3.4 2.85 0 1.55-1 2.5-2.35 2.75L14.5 17h-2.35l-2.3-4.15H9.9V17H8V7zm1.9 4.35h.55c.95 0 1.6-.4 1.6-1.4 0-.95-.6-1.35-1.6-1.35H9.9v2.75z"
        fill={KASPI_RED}
      />
    </svg>
  );
}

export default function BuyTicketModal({ isOpen, onClose, matchId, matchTitle, kickoffAt }: Props) {
  useTelegramBackButton(isOpen, onClose);
  const [step, setStep] = useState<Step>("pick");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) return;
    /* eslint-disable react-hooks/set-state-in-effect -- сброс UI при закрытии */
    setStep("pick");
    setTicketId(null);
    setBusy(false);
    setErrorMessage(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose, busy]);

  /** Шаг 1: заводим билет со статусом `pending` и его QR-секретом. */
  const createTicket = useCallback(async () => {
    setErrorMessage(null);
    const initData = getTelegramInitData();
    if (!initData) {
      setErrorMessage("Откройте приложение через Telegram, чтобы купить билет.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/tickets/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, matchId }),
      });
      const json = (await res.json()) as { ticketId?: string; status?: string };

      if (!res.ok || !json.ticketId) {
        setErrorMessage("Не удалось оформить билет. Попробуйте ещё раз.");
        return;
      }

      setTicketId(json.ticketId);
      // Уже оплаченный билет второй раз оплачивать не нужно.
      setStep(json.status === "paid" ? "done" : "pay");
    } catch (error: unknown) {
      console.error("[BuyTicketModal] purchase threw:", error);
      setErrorMessage("Не удалось оформить билет. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }, [matchId]);

  /** Шаг 2: болельщик вернулся из Kaspi и подтверждает оплату. */
  const confirmPaid = useCallback(async () => {
    if (!ticketId) return;
    setErrorMessage(null);
    const initData = getTelegramInitData();
    if (!initData) {
      setErrorMessage("Откройте приложение через Telegram.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/tickets/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, ticketId }),
      });

      if (!res.ok) {
        setErrorMessage("Не удалось подтвердить оплату. Попробуйте ещё раз.");
        haptic.notify("error");
        return;
      }

      setStep("done");
      haptic.notify("success");
      window.setTimeout(onClose, 2200);
    } catch (error: unknown) {
      console.error("[BuyTicketModal] confirm threw:", error);
      setErrorMessage("Не удалось подтвердить оплату. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }, [ticketId, onClose]);

  const kickoffLabel = kickoffAt ? formatKickoff(kickoffAt) : "";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal
          aria-labelledby="buy-ticket-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-background/80"
            aria-label="Закрыть"
            onClick={busy ? undefined : onClose}
          />

          <motion.div
            className="relative z-10 flex w-full max-w-md flex-col rounded-t-3xl border-t border-line bg-surface px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-2"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto h-1 w-9 rounded-full bg-line-strong" aria-hidden />

            <div className="flex h-12 items-center justify-end">
              <button
                type="button"
                aria-label="Закрыть"
                onClick={onClose}
                disabled={busy}
                className="-mr-2 flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors active:bg-surface-2 disabled:opacity-40"
              >
                <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {step === "done" ? (
                <motion.div
                  key="done"
                  {...stepMotion}
                  className="flex flex-col items-center px-2 pb-8 pt-2 text-center"
                >
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 24, delay: 0.05 }}
                  >
                    <CheckCircle2 className="h-14 w-14 text-win" strokeWidth={1.75} aria-hidden />
                  </motion.span>
                  <h2 id="buy-ticket-title" className="t-h2 mt-4 text-foreground">
                    Билет оформлен
                  </h2>
                  <p className="t-small mt-1.5 max-w-[280px] text-muted">
                    QR-код — в профиле, раздел «Мои билеты»
                  </p>
                </motion.div>
              ) : step === "pay" ? (
                <motion.div key="pay" {...stepMotion} className="flex flex-col">
                  <p className="t-label text-subtle">Оплата</p>
                  <h2 id="buy-ticket-title" className="t-h2 mt-2 text-foreground">
                    Оплатите билет в Kaspi
                  </h2>
                  <p className="t-display mt-3 whitespace-nowrap text-foreground">{TICKET_PRICE}</p>
                  <p className="t-small mt-3 text-muted">
                    Завершите оплату в приложении Kaspi, затем вернитесь и нажмите «Я оплатил».
                  </p>

                  {errorMessage && (
                    <p className="t-small mt-3 text-loss" role="alert">
                      {errorMessage}
                    </p>
                  )}

                  <motion.a
                    href={KASPI_PAY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => haptic.impact("light")}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                    style={{ backgroundColor: KASPI_RED }}
                    className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white"
                  >
                    <KaspiIcon className="h-6 w-6" />
                    Оплатить в Kaspi
                  </motion.a>

                  <Button
                    variant="secondary"
                    fullWidth
                    loading={busy}
                    onClick={confirmPaid}
                    className="mt-3"
                  >
                    Я оплатил
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="pick" {...stepMotion} className="flex flex-col">
                  <p className="t-label text-subtle">Билет на матч</p>
                  {matchTitle ? (
                    <h2 id="buy-ticket-title" className="t-h3 mt-2 text-foreground">
                      {matchTitle}
                    </h2>
                  ) : (
                    <h2 id="buy-ticket-title" className="sr-only">
                      Билет на матч
                    </h2>
                  )}
                  {kickoffLabel && <p className="t-small mt-0.5 text-muted">{kickoffLabel}</p>}

                  <p className="t-display mt-4 whitespace-nowrap text-foreground">{TICKET_PRICE}</p>
                  <p className="t-small mt-2 text-muted">
                    Оформим билет и откроем оплату в Kaspi. QR-код для прохода появится в профиле.
                  </p>

                  {errorMessage && (
                    <p className="t-small mt-3 text-loss" role="alert">
                      {errorMessage}
                    </p>
                  )}

                  <Button fullWidth loading={busy} onClick={createTicket} className="mt-6">
                    Перейти к оплате
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
