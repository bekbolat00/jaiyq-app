"use client";

import { Coins } from "lucide-react";
import { useEffect, useState } from "react";
import MusicToggle from "@/app/components/MusicToggle";
import NotificationBellButton from "@/app/components/NotificationBellButton";

type Props = {
  coins: number | null;
  onNotificationsClick: () => void;
  hasUnreadNotifications: boolean;
};

function formatCoins(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("ru-RU");
}

function greeting(hour: number): string {
  if (hour < 5) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

/** Шапка главной: герб клуба, приветствие по имени из Telegram, монеты и быстрые действия. */
export default function AppTopHeader({ coins, onNotificationsClick, hasUnreadNotifications }: Props) {
  const [hello, setHello] = useState("ФК Жайык");

  useEffect(() => {
    const name = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name;
    const text = `${greeting(new Date().getHours())}${name ? `, ${name}` : ""}`;
    // Приветствие зависит от времени и Telegram — только на клиенте.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHello(text);
  }, []);

  return (
    <header className="sticky top-0 z-20 -mx-4 -mt-2 bg-background/80 px-4 pt-2 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- статичный герб */}
          <img src="/teams/zhaiyq.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="t-h3 truncate text-foreground">ФК Жайык</p>
            <p className="t-caption truncate text-muted">{hello}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div
            className="flex h-10 items-center gap-1.5 rounded-full bg-surface-2 pl-2.5 pr-3"
            title="Жайык-коины"
            aria-label={`Монеты: ${formatCoins(coins)}`}
          >
            <Coins className="h-4 w-4 text-draw" strokeWidth={1.75} aria-hidden />
            <span className="t-small font-semibold tabular-nums text-foreground">{formatCoins(coins)}</span>
          </div>
          <MusicToggle />
          <NotificationBellButton onClick={onNotificationsClick} hasUnread={hasUnreadNotifications} />
        </div>
      </div>
    </header>
  );
}
