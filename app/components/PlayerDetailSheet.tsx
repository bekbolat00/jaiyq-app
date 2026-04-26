"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Player } from "@/lib/types";
import { PRODUCTS } from "@/lib/data/mock";

type Props = {
  player: Player | null;
  onClose: () => void;
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const panelVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 380, damping: 32 },
  },
  exit: { opacity: 0, y: 10, scale: 0.99, transition: { duration: 0.15 } },
};

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 420, damping: 32 },
  },
};

const CAREER_DEMO = [
  { season: "2023/2024", games: 12, goals: 4, assists: 2 },
  { season: "2022/2023", games: 18, goals: 6, assists: 3 },
  { season: "2021/2022", games: 15, goals: 2, assists: 1 },
  { season: "2020/2021", games: 8, goals: 0, assists: 0 },
] as const;

export default function PlayerDetailSheet({ player, onClose }: Props) {
  useEffect(() => {
    if (!player) return;
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
  }, [player, onClose]);

  return (
    <AnimatePresence>
      {player && (
        <motion.div
          key={player.id}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          role="dialog"
          aria-modal
          aria-labelledby="player-detail-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          <motion.div
            role="presentation"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />

          <motion.div
            className="glass-premium relative z-10 flex h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Закрыть"
              onClick={onClose}
              className="absolute right-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30 text-foreground backdrop-blur-md transition-colors hover:bg-black/50"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>

            <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
              <motion.header
                className="relative min-h-[min(40vh,280px)] w-full shrink-0 overflow-hidden sm:min-h-[300px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
              >
                <div
                  className="pointer-events-none absolute inset-0 z-0 flex items-end justify-center pb-2"
                  aria-hidden
                >
                  <span
                    className="translate-y-[10%] font-mono text-[min(44vw,9rem)] font-black leading-none text-white/[0.09] sm:text-[min(36vw,11.5rem)]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {player.number}
                  </span>
                </div>

                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] flex h-[min(36vh,260px)] items-end justify-center"
                  aria-hidden
                >
                  <div
                    className="flex h-full w-[min(78%,300px)] max-w-[300px] items-end justify-center bg-gradient-to-b from-white/[0.04] to-white/[0.1]"
                    style={{
                      WebkitMaskImage:
                        "linear-gradient(to top, black 0%, black 75%, rgba(0,0,0,0.4) 92%, transparent 100%)",
                      maskImage:
                        "linear-gradient(to top, black 0%, black 75%, rgba(0,0,0,0.4) 92%, transparent 100%)",
                    }}
                  />
                </div>

                <div className="absolute bottom-0 left-0 z-[2] max-w-[72%] p-4 pr-2 pb-5 sm:max-w-[70%] sm:p-5">
                  <h1
                    id="player-detail-title"
                    className="font-black text-4xl uppercase leading-tight tracking-tight"
                  >
                    {player.firstName}
                    <br />
                    {player.lastName}
                  </h1>
                  <p className="neon-cyan mt-1.5 text-sm font-bold uppercase tracking-[0.14em] text-accent">
                    {player.position}
                  </p>
                </div>
              </motion.header>

              <motion.div
                className="flex flex-col gap-0 px-4 pb-4 pt-0 sm:px-5"
                variants={stagger}
                initial="hidden"
                animate="visible"
              >
                <motion.div
                  variants={item}
                  className="grid grid-cols-2 border border-white/10"
                >
                  {(
                    [
                      { label: "Амплуа", value: player.position },
                      {
                        label: "Вес",
                        value: `${player.stats.weightKg} кг`,
                      },
                      { label: "Дата рождения", value: player.birthDate },
                      {
                        label: "Рост",
                        value: `${player.stats.heightCm} см`,
                      },
                    ] as const
                  ).map((row, i) => (
                    <div
                      key={row.label}
                      className={
                        i === 0
                          ? "border-r border-b border-white/10 px-3 py-3.5"
                          : i === 1
                            ? "border-b border-white/10 px-3 py-3.5"
                            : i === 2
                              ? "border-r border-white/10 px-3 py-3.5"
                              : "px-3 py-3.5"
                      }
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                        {row.label}
                      </p>
                      <p className="mt-1 text-[15px] font-semibold text-foreground">
                        {row.value}
                      </p>
                    </div>
                  ))}
                </motion.div>

                <motion.section variants={item} className="mt-6">
                  <h2 className="font-black uppercase tracking-widest text-foreground/95">
                    Биография
                  </h2>
                  <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-muted">
                    <p>
                      Профессиональную карьеру начал в академии, затем закрепился
                      в основе команды. Отличается дисциплиной, техникой и
                      умением читать игру: в важных матчах чаще других
                      оказывается на нужной позиции и вносит решающий вклад.
                    </p>
                    <p>
                      В составе &laquo;Жайыка&raquo; — один из опорных
                      футболистов: стабильный уровень в чемпионате, участие в
                      еврокубках и работа над сильными сторонами в каждом
                      сезоне. Предан клубным ценностям и фанатской
                      поддержке трибун.
                    </p>
                  </div>
                </motion.section>

                <motion.section variants={item} className="mt-8">
                  <h2 className="font-black uppercase tracking-widest text-foreground/95">
                    Игровая карьера
                  </h2>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[300px] border-collapse text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="py-2.5 pr-3 font-bold uppercase tracking-wider text-muted">
                            Сезон
                          </th>
                          <th className="px-2 py-2.5 text-center font-bold uppercase tracking-wider text-muted">
                            Матчи
                          </th>
                          <th className="px-2 py-2.5 text-center font-bold uppercase tracking-wider text-muted">
                            Голы
                          </th>
                          <th className="py-2.5 pl-3 text-center font-bold uppercase tracking-wider text-muted">
                            Ассисты
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {CAREER_DEMO.map((r) => (
                          <tr
                            key={r.season}
                            className="border-b border-white/10 last:border-0"
                          >
                            <td className="py-2.5 pr-3 font-mono font-semibold tabular-nums text-foreground/95">
                              {r.season}
                            </td>
                            <td className="px-2 py-2.5 text-center font-mono tabular-nums text-foreground/90">
                              {r.games}
                            </td>
                            <td className="px-2 py-2.5 text-center font-mono tabular-nums text-foreground/90">
                              {r.goals}
                            </td>
                            <td className="py-2.5 pl-3 text-center font-mono tabular-nums text-foreground/90">
                              {r.assists}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.section>

                <motion.div
                  variants={item}
                  className="sticky bottom-4 z-20 mt-8"
                >
                  {(() => {
                    const jersey = PRODUCTS.find(
                      (p) => p.id === player.jerseyProductId
                    );
                    return (
                      <>
                        <button
                          type="button"
                          className="neon-cyan accent-glow flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-accent/30 bg-accent px-3 text-center text-[14px] font-black tracking-wide text-[#020408] shadow-[0_0_28px_rgba(0,240,255,0.4)] transition-[transform,filter] hover:brightness-110 active:scale-[0.99]"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5 shrink-0"
                            aria-hidden
                          >
                            <path d="M4 7h3l3-3h4l3 3h3v2l-2 1v9a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-9L4 9V7Z" />
                          </svg>
                          Купить футболку {player.lastName}
                        </button>
                        {jersey && (
                          <p className="mt-2 text-center text-xs text-muted">
                            {jersey.title} ·{" "}
                            {jersey.priceKzt.toLocaleString("ru-RU")} ₸
                          </p>
                        )}
                      </>
                    );
                  })()}
                </motion.div>
                <div className="h-2 shrink-0" aria-hidden />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
