"use client";

import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronRight, FolderOpen, Images } from "lucide-react";
import { haptic } from "@/lib/telegram/webApp";

export type AvatarPickSource = "gallery" | "camera" | "file";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Кнопки шторки вызывают это — родитель настраивает скрытый input и делает .click(). */
  onPickSource: (source: AvatarPickSource) => void;
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

function RowButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick?: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic.impact("light");
        onClick?.();
      }}
      className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors active:bg-surface-2"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-foreground">
        {icon}
      </span>
      <span className="t-body min-w-0 flex-1 text-foreground">{label}</span>
      <ChevronRight className="h-5 w-5 text-subtle" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

export default function AvatarUploadSheet({ open, onClose, onPickSource }: Props) {
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

  const iconCls = "h-5 w-5";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col justify-end"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          role="dialog"
          aria-modal
          aria-labelledby="avatar-upload-title"
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-background/70"
            aria-label="Закрыть"
            onClick={onClose}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          />
          <motion.aside
            className="relative z-10 mx-auto w-full max-w-lg rounded-t-3xl border-t border-line bg-surface"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-line-strong" aria-hidden />
            <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              <h2 id="avatar-upload-title" className="t-h2 text-foreground">
                Фото профиля
              </h2>
              <p className="t-small mt-1 text-muted">JPG или PNG, до 5 МБ</p>

              <nav
                className="mt-4 divide-y divide-line overflow-hidden rounded-2xl bg-surface-2/50"
                aria-label="Источник фото"
              >
                <RowButton
                  label="Медиатека"
                  onClick={() => onPickSource("gallery")}
                  icon={<Images className={iconCls} strokeWidth={1.75} aria-hidden />}
                />
                <RowButton
                  label="Сделать снимок"
                  onClick={() => onPickSource("camera")}
                  icon={<Camera className={iconCls} strokeWidth={1.75} aria-hidden />}
                />
                <RowButton
                  label="Выбрать файл"
                  onClick={() => onPickSource("file")}
                  icon={<FolderOpen className={iconCls} strokeWidth={1.75} aria-hidden />}
                />
              </nav>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
