"use client";

import { motion } from "framer-motion";

export const SPLASH_DURATION_MS = 1400;

/** Заставка: герб на фирменном ночном синем, тонкая полоса загрузки. */
export function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-background"
      style={{
        background:
          "radial-gradient(90% 60% at 50% 42%, rgba(14,31,115,0.75) 0%, rgba(5,10,28,1) 70%)",
      }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <motion.img
        src="/teams/zhaiyq.png"
        alt="ФК Жайык"
        className="h-32 w-32 object-contain"
        initial={{ opacity: 0, scale: 0.94, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      />
      <motion.p
        className="t-label mt-6 text-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.4 }}
      >
        ФК Жайык · Уральск
      </motion.p>
      <div className="mt-6 h-[2px] w-24 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full w-full rounded-full bg-accent"
          style={{ transformOrigin: "0% 50%" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: SPLASH_DURATION_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
    </motion.div>
  );
}
