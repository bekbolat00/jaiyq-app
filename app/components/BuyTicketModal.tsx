"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getTelegramInitData } from "@/lib/telegram/getInitData";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
};

const KASPI_PHONE = "+7 777 123 45 67";
const KASPI_NAME = "Иванов И.";
const TICKET_PRICE = "1 000 ₸";

const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const panel = {
  hidden: { y: 24, opacity: 0, scale: 0.97 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 380, damping: 32 },
  },
  exit: { y: 16, opacity: 0, scale: 0.98, transition: { duration: 0.2 } },
};

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className ?? ""}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function KaspiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" />
      <path
        d="M8 7h2.6c2.1 0 3.4 1.05 3.4 2.85 0 1.55-1 2.5-2.35 2.75L14.5 17h-2.35l-2.3-4.15H9.9V17H8V7zm1.9 4.35h.55c.95 0 1.6-.4 1.6-1.4 0-.95-.6-1.35-1.6-1.35H9.9v2.75z"
        fill="#0A1A17"
      />
    </svg>
  );
}

export default function BuyTicketModal({ isOpen, onClose, matchId }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) return;
    /* eslint-disable react-hooks/set-state-in-effect -- сброс UI при закрытии */
    setSubmitting(false);
    setShowSuccess(false);
    setErrorMessage(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  const handlePaid = async () => {
    setErrorMessage(null);
    setSubmitting(true);

    const initData = getTelegramInitData();
    if (!initData) {
      setErrorMessage("Откройте приложение через Telegram, чтобы оформить заявку.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/tickets/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, matchId }),
      });

      if (!res.ok) {
        console.error("[BuyTicketModal] purchase failed:", res.status, await res.text());
        setErrorMessage("Не удалось отправить заявку. Попробуйте ещё раз.");
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      setShowSuccess(true);
      window.setTimeout(() => {
        onClose();
      }, 1600);
    } catch (error: unknown) {
      console.error("[BuyTicketModal] purchase threw:", error);
      setErrorMessage("Не удалось отправить заявку. Попробуйте ещё раз.");
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal
          aria-labelledby="buy-ticket-title"
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-[#010306]/90 backdrop-blur-md"
            aria-label="Закрыть"
            onClick={onClose}
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
          />

          <motion.div
            className="glass-premium relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/[0.08] sm:rounded-3xl"
            style={{
              background:
                "linear-gradient(168deg, rgba(1,3,8,0.97) 0%, rgba(3,8,16,0.96) 45%, rgba(1,2,6,0.99) 100%)",
            }}
            variants={panel}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Закрыть"
              onClick={onClose}
              disabled={submitting}
              className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-foreground backdrop-blur-md transition-colors hover:bg-black/60 disabled:pointer-events-none disabled:opacity-40"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>

            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className="flex flex-col items-center justify-center gap-4 px-6 py-16"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -40 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.05 }}
                    className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-accent bg-accent/15 neon-cyan-surface shadow-[0_0_40px_rgba(0,240,255,0.35)]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-12 w-12 text-accent"
                      aria-hidden
                    >
                      <motion.path
                        d="M6 12l4 4 8-8"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
                      />
                    </svg>
                  </motion.div>
                  <p className="text-center text-lg font-black uppercase tracking-wide text-foreground">
                    Заявка отправлена!
                  </p>
                  <p className="max-w-[260px] text-center text-xs font-medium leading-relaxed text-white/50">
                    QR-код появится после проверки платежа.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col px-5 pb-8 pt-12"
                >
                  <h2
                    id="buy-ticket-title"
                    className="text-center text-lg font-black uppercase tracking-tight text-foreground"
                  >
                    Оплата билета
                  </h2>

                  <p className="mt-3 text-center text-5xl font-black tracking-tight text-white drop-shadow-[0_0_24px_rgba(0,240,255,0.15)]">
                    {TICKET_PRICE}
                  </p>

                  <div className="mt-6 space-y-3 rounded-2xl border border-white/[0.09] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <p className="text-sm font-medium leading-relaxed text-foreground/90">
                      1. Переведите сумму на Kaspi Gold по номеру{" "}
                      <span className="font-black text-white">{KASPI_PHONE}</span> ({KASPI_NAME}).
                    </p>
                    <p className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2.5 text-xs font-bold leading-relaxed text-orange-400">
                      В сообщении к переводу обязательно укажите ваш никнейм!
                    </p>
                  </div>

                  {errorMessage && (
                    <p className="mt-3 text-center text-xs font-bold text-red-400">{errorMessage}</p>
                  )}

                  <div className="mt-6 flex flex-col gap-3">
                    <a
                      href="https://kaspi.kz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e11f26] py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_24px_rgba(225,31,38,0.35)] transition-[transform,filter] active:scale-[0.99] active:brightness-95"
                    >
                      <KaspiIcon className="h-5 w-5 text-white" />
                      Открыть приложение Kaspi
                    </a>

                    <motion.button
                      type="button"
                      disabled={submitting}
                      onClick={handlePaid}
                      whileTap={{ scale: 0.98 }}
                      className="neon-cyan-surface flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_28px_rgba(0,240,255,0.4)] transition-[transform,filter] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Spinner className="h-5 w-5 text-black" />
                          <span>Отправка…</span>
                        </>
                      ) : (
                        "Я оплатил"
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
