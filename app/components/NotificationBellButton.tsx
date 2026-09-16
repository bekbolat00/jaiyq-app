"use client";

import { Bell } from "lucide-react";

type Props = {
  onClick: () => void;
  hasUnread: boolean;
  className?: string;
};

export default function NotificationBellButton({
  onClick,
  hasUnread,
  className = "",
}: Props) {
  return (
    <button
      type="button"
      aria-label={hasUnread ? "Уведомления, есть непрочитанные" : "Уведомления"}
      onClick={onClick}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-foreground transition-transform duration-[120ms] ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 active:scale-[0.96] ${className}`}
    >
      <Bell strokeWidth={1.75} className="h-5 w-5" aria-hidden />
      {hasUnread ? (
        <span
          className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-live ring-2 ring-background"
          aria-hidden
        />
      ) : null}
    </button>
  );
}
