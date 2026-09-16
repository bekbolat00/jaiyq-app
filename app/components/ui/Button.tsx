"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { haptic } from "@/lib/telegram/webApp";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "lg" | "md" | "sm";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-105",
  secondary: "bg-surface-2 text-foreground hover:bg-[#13224f]",
  ghost: "bg-transparent text-accent hover:bg-accent/[0.06]",
  danger: "bg-transparent text-loss hover:bg-loss/[0.08]",
};

const SIZE: Record<Size, string> = {
  lg: "h-[52px] px-5 text-[15px] gap-2 rounded-xl",
  md: "h-11 px-4 text-[15px] gap-2 rounded-xl",
  sm: "h-9 px-3 text-[13px] gap-1.5 rounded-lg",
};

type Props = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
};

/** Кнопка дизайн-системы. Одна `primary` на экран — см. DESIGN_SYSTEM.md. */
export default function Button({
  variant = "primary",
  size = "lg",
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  className = "",
  onClick,
  children,
  ...rest
}: Props) {
  const inactive = disabled || loading;
  return (
    <motion.button
      type="button"
      whileTap={inactive ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      disabled={inactive}
      aria-busy={loading || undefined}
      onClick={(e) => {
        if (inactive) return;
        haptic.impact("light");
        onClick?.(e);
      }}
      className={`relative inline-flex select-none items-center justify-center font-semibold transition-[background-color,filter,opacity] duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT[variant]} ${SIZE[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2} aria-hidden />
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </motion.button>
  );
}
