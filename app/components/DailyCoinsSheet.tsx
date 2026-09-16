"use client";

import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { AnimatePresence, motion } from "framer-motion";
import { Coins } from "lucide-react";
import { useEffect } from "react";
import Button from "@/app/components/ui/Button";
import { haptic } from "@/lib/telegram/webApp";

type Props = {
  open: boolean;
  onClose: () => void;
  streak: number;
  bonusAmount: number;
};

const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const panel = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 36 },
  },
  exit: { y: "100%", transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] as const } },
};

function daysWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}

export default function DailyCoinsSheet({ open, onClose, streak, bonusAmount }: Props) {
  useTelegramBackButton(open, onClose);

  useEffect(() => {
    if (!open) return;
    haptic.notify("success");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col justify-end"
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.button
            type="button"
            aria-label="Закрыть"
            variants={backdrop}
            className="absolute inset-0 bg-background/70"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="daily-coins-title"
            variants={panel}
            className="relative z-10 mx-auto w-full max-w-lg rounded-t-3xl border-t border-line bg-surface"
          >
            <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-line-strong" aria-hidden />
            <div className="flex flex-col items-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 text-center">
              <motion.span
                className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.12 }}
                aria-hidden
              >
                <Coins className="h-7 w-7" strokeWidth={1.75} />
              </motion.span>

              <motion.p
                className="t-display mt-4 text-accent"
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
              >
                +{bonusAmount}
              </motion.p>

              <h2 id="daily-coins-title" className="t-h2 mt-2 text-foreground">
                Ежедневный бонус
              </h2>
              <p className="t-body mt-1 max-w-[300px] text-muted">
                Жайык-коины начислены на ваш баланс
              </p>
              <p className="t-small mt-3 tabular-nums text-muted">
                Серия: {streak} {daysWord(streak)} подряд
              </p>

              <Button variant="primary" size="lg" fullWidth className="mt-6" onClick={onClose}>
                Забрать
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
