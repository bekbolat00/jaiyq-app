"use client";

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

export default function AppTopHeader({
  coins,
  onNotificationsClick,
  hasUnreadNotifications,
}: Props) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-0.5 w-auto min-w-0 self-stretch border-b border-white/[0.06] bg-transparent px-4">
      <div className="flex w-full items-center justify-between py-4">
        <h1 className="min-w-0 shrink truncate text-2xl font-black uppercase leading-none tracking-tight text-white">
          ГЛАВНАЯ
        </h1>

        <div className="flex shrink-0 items-center gap-2">
          <div
            className="flex items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/10 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md"
            title="Жайык-Коины"
          >
            <span className="text-[13px] font-black tabular-nums tracking-tight text-foreground">
              {formatCoins(coins)}
            </span>
            <span className="select-none text-[15px] leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)] filter">
              🪙
            </span>
          </div>

          <MusicToggle />

          <NotificationBellButton
            onClick={onNotificationsClick}
            hasUnread={hasUnreadNotifications}
          />
        </div>
      </div>
    </header>
  );
}
