"use client";

import { motion } from "framer-motion";
import { haptic } from "@/lib/telegram/webApp";

type Tab<T extends string> = { id: T; label: string };

type Props<T extends string> = {
  tabs: Tab<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Уникальный id для анимации подчёркивания, если на экране несколько табов. */
  layoutId: string;
  className?: string;
};

/** Табы с подчёркиванием, которое переезжает к выбранному пункту. */
export default function Tabs<T extends string>({ tabs, value, onChange, layoutId, className = "" }: Props<T>) {
  return (
    <div
      role="tablist"
      className={`hide-scrollbar flex gap-6 overflow-x-auto border-b border-line ${className}`}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (active) return;
              haptic.select();
              onChange(tab.id);
            }}
            className={`relative shrink-0 pb-3 pt-1 text-[15px] font-medium transition-colors duration-200 ${
              active ? "text-foreground" : "text-subtle"
            }`}
          >
            {tab.label}
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
