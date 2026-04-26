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
      aria-label="Уведомления"
      onClick={onClick}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-visible rounded-xl border border-accent/50 bg-transparent text-accent shadow-none transition-[transform,box-shadow,colors] hover:shadow-[0_0_10px_#00F0FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.96] active:shadow-[0_0_10px_#00F0FF] ${className}`}
    >
      <Bell strokeWidth={2} className="h-5 w-5" aria-hidden />
      {hasUnread ? (
        <span
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-orange-500"
          aria-label="Есть непрочитанные уведомления"
        />
      ) : null}
    </button>
  );
}
