"use client";

import { motion } from "framer-motion";
import { haptic } from "@/lib/telegram/webApp";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
};

/**
 * Строка настройки с переключателем в стиле iOS (51×31).
 * Без собственной рамки — кладётся в сгруппированный список `card divide-y`.
 */
export default function ToggleSwitch({ checked, onChange, label, description }: Props) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="t-body block text-foreground">{label}</span>
        {description && (
          <span className="t-caption mt-0.5 block text-muted">{description}</span>
        )}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => {
          haptic.select();
          onChange(!checked);
        }}
        className={`relative h-[31px] w-[51px] shrink-0 rounded-full p-[2px] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          checked ? "bg-accent" : "bg-surface-2"
        }`}
      >
        <motion.span
          className="block h-[27px] w-[27px] rounded-full bg-white"
          initial={false}
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 700, damping: 42 }}
        />
      </button>
    </div>
  );
}
