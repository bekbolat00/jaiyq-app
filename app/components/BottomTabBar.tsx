"use client";

import { motion } from "framer-motion";
import { Home, ShoppingBag, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { haptic } from "@/lib/telegram/webApp";

type Tab = {
  href: string;
  label: string;
  Icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  { href: "/", label: "Главная", Icon: Home, match: (p) => p === "/" },
  { href: "/team", label: "Команда", Icon: Users, match: (p) => p.startsWith("/team") },
  { href: "/shop", label: "Магазин", Icon: ShoppingBag, match: (p) => p.startsWith("/shop") },
  { href: "/profile", label: "Профиль", Icon: UserRound, match: (p) => p.startsWith("/profile") },
];

// Рабочего места стюарда (`/scanner`) в общей навигации намеренно нет:
// это служебный экран, он открывается по прямой ссылке, а доступ к
// гашению билетов ограничивается списком STEWARD_TELEGRAM_IDS.

export default function BottomTabBar() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="Основная навигация"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)]"
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-[440px] items-stretch rounded-3xl border border-line bg-[#0a1433]/[0.97] p-1.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        {TABS.map(({ href, label, Icon, match }) => {
          const isActive = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => {
                if (!isActive) haptic.select();
              }}
              aria-current={isActive ? "page" : undefined}
              className="relative flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl"
            >
              {isActive && (
                <motion.span
                  layoutId="tabbar-active"
                  className="absolute inset-0 rounded-2xl bg-white/[0.06]"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <Icon
                className={`relative h-[22px] w-[22px] transition-colors ${isActive ? "text-accent" : "text-subtle"}`}
                strokeWidth={isActive ? 2 : 1.75}
                aria-hidden
              />
              <span className={`relative text-[11px] font-medium leading-none transition-colors ${isActive ? "text-foreground" : "text-subtle"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
