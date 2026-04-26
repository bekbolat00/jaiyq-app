"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useEffect } from "react";
import type { AppNotification } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  items: AppNotification[];
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const sheetVariants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring" as const, stiffness: 420, damping: 40 },
  },
  exit: { y: "100%", transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const } },
};

function InitialBadge({ initial, tone }: { initial: string; tone: "orange" | "cyan" }) {
  const cls =
    tone === "orange"
      ? "bg-[#f97316] text-[#020408] shadow-[0_0_20px_rgba(249,115,22,0.35)]"
      : "bg-accent text-[#020408] shadow-[0_0_18px_rgba(0,240,255,0.28)]";
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-black uppercase ${cls}`}
    >
      {initial.slice(0, 1)}
    </span>
  );
}

export default function NotificationsSheet({ open, onClose, items }: Props) {
  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[75] flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-[#020408]/72 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="notifications-sheet-title"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="glass-premium relative z-10 mx-auto flex h-[min(88vh,820px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 border-b-0 bg-[#020408]/95 shadow-[0_-12px_48px_rgba(0,0,0,0.55)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/15" aria-hidden />

            <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-3 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-white/[0.06]"
                aria-label="Назад"
              >
                <ChevronLeft className="h-6 w-6" strokeWidth={2} aria-hidden />
              </button>
              <h1
                id="notifications-sheet-title"
                className="min-w-0 flex-1 text-lg font-bold uppercase italic tracking-wide text-foreground"
              >
                Уведомления
              </h1>
              <span className="w-10 shrink-0" aria-hidden />
            </header>

            <motion.div
              className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
            >
              {items.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted">Пока пусто</p>
              ) : (
                <ul className="space-y-3">
                  {items.map((n, i) => (
                    <motion.li
                      key={n.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.04 * i,
                        duration: 0.32,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <div
                        className={`glass-premium flex items-start gap-3 rounded-2xl border border-white/[0.08] px-3 py-3 shadow-[0_0_24px_rgba(0,0,0,0.35)] ${
                          n.isNew ? "ring-1 ring-white/10" : ""
                        }`}
                      >
                        <InitialBadge initial={n.initial} tone={n.tone} />
                        <p className="min-w-0 flex-1 text-left text-[13px] leading-snug text-foreground/95">
                          {n.text}
                        </p>
                        <time
                          className="shrink-0 self-start pt-0.5 text-right text-[10px] font-medium text-muted"
                          dateTime={n.date}
                        >
                          {n.date}
                        </time>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
