"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type AvatarPickSource = "gallery" | "camera" | "file";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Кнопки шторки вызывают это — родитель настраивает скрытый input и делает .click(). */
  onPickSource: (source: AvatarPickSource) => void;
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
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

function RowButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-4 text-left text-[15px] font-semibold text-foreground transition-colors hover:bg-white/[0.04]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-accent">
        {children}
      </span>
      {label}
    </button>
  );
}

export default function AvatarUploadSheet({ open, onClose, onPickSource }: Props) {
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
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal
          aria-labelledby="avatar-upload-title"
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-[#020408]/72 backdrop-blur-sm"
            aria-label="Закрыть"
            onClick={onClose}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          />
          <motion.aside
            className="glass-premium relative z-10 w-full overflow-hidden rounded-t-3xl border border-white/10 border-b-0 bg-[#020408]/95 shadow-[0_-12px_48px_rgba(0,0,0,0.55)]"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/15"
              aria-hidden
            />
            <h2 id="avatar-upload-title" className="sr-only">
              Загрузка фото профиля
            </h2>
            <nav
              className="mt-2 divide-y divide-white/10 px-1 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
              aria-label="Источник фото"
            >
              <RowButton
                label="Медиатека"
                onClick={() => onPickSource("gallery")}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
                  <path
                    d="M21 15l-5-5-4 4-3-3-6 6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </RowButton>
              <RowButton
                label="Сделать снимок"
                onClick={() => onPickSource("camera")}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                  <path
                    d="M4 9h3l1.5-2h7L17 9h3a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2v-8a2 2 0 012-2z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="14" r="3.2" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </RowButton>
              <RowButton
                label="Выбрать файл"
                onClick={() => onPickSource("file")}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                  <path
                    d="M4 7a2 2 0 012-2h5l2 2h5a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 12h16"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </RowButton>
            </nav>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
