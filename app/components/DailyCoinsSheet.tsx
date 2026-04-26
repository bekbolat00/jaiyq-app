"use client";

import { AnimatePresence, motion } from "framer-motion";

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
  hidden: { y: 28, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 400, damping: 34 },
  },
  exit: { y: 20, opacity: 0, transition: { duration: 0.2 } },
};

export default function DailyCoinsSheet({ open, onClose, streak, bonusAmount }: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.button
            type="button"
            aria-label="Закрыть"
            variants={backdrop}
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="daily-coins-title"
            variants={panel}
            className="relative z-10 mx-4 mb-[max(1.5rem,env(safe-area-inset-bottom))] w-full max-w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-accent/30 bg-[#050a10]/95 shadow-[0_0_60px_rgba(0,240,255,0.2),inset_0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-xl sm:mb-0"
          >
            <div
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl"
              aria-hidden
            />
            <div className="relative px-6 pb-6 pt-8 text-center">
              <p className="text-5xl drop-shadow-[0_0_18px_rgba(255,120,40,0.55)]" aria-hidden>
                🔥
              </p>
              <h2
                id="daily-coins-title"
                className="mt-4 text-lg font-black uppercase leading-tight tracking-[0.12em] text-foreground"
              >
                Первый день в копилке!
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-muted">
                Ты зашёл сегодня впервые — начисляем{" "}
                <span className="font-bold text-accent">{bonusAmount} Жайык-Коинов</span> на баланс.
                Серия дней подряд:{" "}
                <span className="font-mono font-bold tabular-nums text-foreground">{streak}</span>.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="neon-cyan-surface mt-8 w-full rounded-2xl bg-accent py-3.5 text-center text-xs font-black uppercase tracking-[0.2em] text-black shadow-[0_0_28px_rgba(0,240,255,0.45)] transition-[transform,filter] active:scale-[0.99] active:brightness-95"
              >
                Забрать
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
