"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Tab = {
  href: string;
  label: string;
  icon: ReactNode;
  match: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: "/",
    label: "Главная",
    match: (p) => p === "/",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
      </svg>
    ),
  },
  {
    href: "/team",
    label: "Команда",
    match: (p) => p.startsWith("/team"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <circle cx="9" cy="9" r="3.2" />
        <circle cx="17" cy="10" r="2.4" />
        <path d="M3 19c.6-3 3.2-5 6-5s5.4 2 6 5" />
        <path d="M14.5 19c.4-2 2-3.5 4-3.5 1.4 0 2.6.6 3.3 1.5" />
      </svg>
    ),
  },
  {
    href: "/shop",
    label: "Магазин",
    match: (p) => p.startsWith("/shop"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M4 7h16l-1.2 11.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 7Z" />
        <path d="M9 7a3 3 0 1 1 6 0" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Профиль",
    match: (p) => p.startsWith("/profile"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <circle cx="12" cy="8.5" r="3.8" />
        <path d="M4.5 20c.8-3.5 3.8-6 7.5-6s6.7 2.5 7.5 6" />
      </svg>
    ),
  },
];

export default function BottomTabBar() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="Основная навигация"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]"
    >
      <div className="pointer-events-auto glass-strong mx-auto flex w-full max-w-[440px] items-stretch justify-between rounded-[22px] px-2 py-2 shadow-[0_16px_60px_-20px_rgba(0,0,0,0.7)]">
        {TABS.map((tab) => {
          const isActive = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-colors"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                  isActive ? "neon-cyan text-accent" : "text-muted"
                }`}
              >
                {tab.icon}
              </span>
              <span
                className={`text-[11px] font-medium tracking-wide transition-colors ${
                  isActive ? "neon-cyan text-accent" : "text-muted"
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="neon-cyan absolute -top-1 h-1 w-8 rounded-full bg-accent shadow-[0_0_14px_2px_rgba(0,240,255,0.6)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
