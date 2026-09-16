"use client";

import { motion } from "framer-motion";
import { Fragment } from "react";
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

/** Мяч для центральной кнопки «Забей гол». */
function BallIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M12 7.6 15.6 10.2 14.2 14.4H9.8L8.4 10.2Z" fill="currentColor" fillOpacity="0.9" />
      <path d="M12 7.6V2.8M15.6 10.2l4.5-1.5M14.2 14.4l2.8 3.9M9.8 14.4 7 18.3M8.4 10.2 3.9 8.7" />
    </svg>
  );
}

function GameButton({ active }: { active: boolean }) {
  return (
    <Link
      href="/game"
      onClick={() => haptic.impact("medium")}
      aria-label="Забей гол — мини-игра"
      aria-current={active ? "page" : undefined}
      className="relative -mt-7 flex w-[76px] shrink-0 flex-col items-center gap-1"
    >
      <motion.span
        whileTap={{ scale: 0.92 }}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_8px_24px_-6px_rgba(0,232,240,0.55)] ring-4 ring-background"
      >
        <motion.span animate={{ rotate: [0, -12, 10, 0] }} transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3.2 }}>
          <BallIcon />
        </motion.span>
      </motion.span>
      <span className="text-[11px] font-medium leading-none text-foreground">Забей гол</span>
    </Link>
  );
}

export default function BottomTabBar() {
  const pathname = usePathname() ?? "/";
  // В игре своё полноэкранное управление — меню не показываем.
  if (pathname.startsWith("/game")) return null;

  return (
    <nav
      aria-label="Основная навигация"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)]"
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-[440px] items-stretch rounded-3xl border border-line bg-[#0a1433]/[0.97] p-1.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        {TABS.map(({ href, label, Icon, match }, index) => {
          const isActive = match(pathname);
          return (
            <Fragment key={href}>
            {index === 2 && <GameButton active={false} />}
            <Link
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
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
}
