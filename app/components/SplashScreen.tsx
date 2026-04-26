"use client";

import { motion } from "framer-motion";

export const SPLASH_DURATION_MS = 2500;

export function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-[300] flex flex-col bg-black text-foreground"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <div className="flex h-[min(44vh,340px)] w-full max-w-[360px] shrink-0 items-center justify-center">
          <motion.div
            className="relative flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: [0.9, 1.05, 0.9] }}
            transition={{
              opacity: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
              scale: {
                repeat: Infinity,
                duration: 2,
                ease: "easeInOut",
              },
            }}
            style={{
              filter: "drop-shadow(0 0 20px rgba(0,240,255,0.5))",
            }}
          >
            <motion.img
              src="/teams/zhaiyq.png"
              alt="Jaiyq"
              className="h-40 w-40 object-contain sm:h-44 sm:w-44 md:h-48 md:w-48"
            />
          </motion.div>
        </div>

        <div className="mt-10 w-full max-w-[280px] shrink-0">
          <div
            className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
            style={{
              boxShadow:
                "inset 0 0 12px rgba(0, 240, 255, 0.12), 0 0 24px rgba(0, 240, 255, 0.15)",
            }}
          >
            <motion.div
              className="absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-cyan-400 via-accent to-cyan-300"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: SPLASH_DURATION_MS / 1000,
                ease: "linear",
              }}
              style={{
                transformOrigin: "0% 50%",
                boxShadow:
                  "0 0 16px rgba(0, 240, 255, 0.85), 0 0 32px rgba(0, 240, 255, 0.45)",
              }}
            />
          </div>
          <p
            className="mt-4 text-center text-[13px] font-semibold tracking-wide text-accent"
            style={{
              textShadow:
                "0 0 14px rgba(0, 240, 255, 0.55), 0 0 28px rgba(0, 240, 255, 0.35), 0 0 42px rgba(0, 240, 255, 0.2)",
            }}
          >
            ПОДОЖДИ БОЛЕЛЬЩИК...
          </p>
        </div>
      </div>
    </motion.div>
  );
}
