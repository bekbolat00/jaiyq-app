"use client";

import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { AnimatePresence, motion } from "framer-motion";
import { BellOff, X } from "lucide-react";
import { useEffect } from "react";
import EmptyState from "@/app/components/ui/EmptyState";
import type { AppNotification } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  items: AppNotification[];
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const sheetVariants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 36 },
  },
  exit: { y: "100%", transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] as const } },
};

function InitialBadge({ initial, tone }: { initial: string; tone: AppNotification["tone"] }) {
  const cls = tone === "orange" ? "bg-draw/12 text-draw" : "bg-accent/10 text-accent";
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold ${cls}`}
      aria-hidden
    >
      {initial.slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function NotificationsSheet({ open, onClose, items }: Props) {
  useTelegramBackButton(open, onClose);
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
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-background/70"
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
            className="relative z-10 mx-auto flex max-h-[min(88vh,820px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-line bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong" aria-hidden />

            <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-4">
              <h2 id="notifications-sheet-title" className="t-h2 text-foreground">
                Уведомления
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted transition-colors active:text-foreground"
                aria-label="Закрыть"
              >
                <X className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {items.length === 0 ? (
                <EmptyState
                  icon={<BellOff className="h-6 w-6" strokeWidth={1.75} aria-hidden />}
                  title="Уведомлений пока нет"
                  description="Здесь появятся новости клуба и напоминания о матчах."
                />
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {items.map((n, i) => (
                    <motion.li
                      key={n.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: Math.min(i, 5) * 0.04,
                        duration: 0.22,
                        ease: [0.2, 0.8, 0.2, 1],
                      }}
                      className="flex items-start gap-3 px-4 py-3"
                    >
                      <InitialBadge initial={n.initial} tone={n.tone} />
                      <div className="min-w-0 flex-1">
                        <p className={`t-body ${n.isNew ? "text-foreground" : "text-muted"}`}>
                          {n.text}
                        </p>
                        <time className="t-caption mt-1 block tabular-nums text-muted" dateTime={n.date}>
                          {n.date}
                        </time>
                      </div>
                      {n.isNew ? (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent">
                          <span className="sr-only">Новое</span>
                        </span>
                      ) : null}
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
