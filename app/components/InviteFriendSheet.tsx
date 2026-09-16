"use client";

import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Search, Send, UserX, X } from "lucide-react";
import Button from "@/app/components/ui/Button";
import EmptyState from "@/app/components/ui/EmptyState";
import { haptic } from "@/lib/telegram/webApp";
import type { Match, SocialFriend } from "@/lib/types";
import { FRIENDS } from "@/lib/data/mock";

type Props = {
  open: boolean;
  match: Match | null;
  onClose: () => void;
};

const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const panel = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 36 },
  },
  exit: { y: "100%", transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] as const } },
};

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function rankOf(friend: SocialFriend) {
  return friend.isPro ? "Премиум" : friend.rankLabel;
}

function FriendAvatar({ friend, size = 44 }: { friend: SocialFriend; size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (friend.avatarUrl && !imgFailed) {
    return (
      <span
        className="relative block shrink-0 overflow-hidden rounded-full bg-surface-2"
        style={{ width: size, height: size }}
      >
        <Image
          src={friend.avatarUrl}
          alt=""
          width={size * 2}
          height={size * 2}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-navy font-semibold text-foreground"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
    >
      {initialsOf(friend.name)}
    </span>
  );
}

function FriendDetails({ friend, onBack }: { friend: SocialFriend; onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <button
        type="button"
        onClick={onBack}
        className="t-small -ml-2 flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-accent active:bg-accent/[0.08]"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        Все друзья
      </button>
      <div className="mt-4 flex flex-col items-center text-center">
        <FriendAvatar friend={friend} size={88} />
        <p className="t-h2 mt-3 text-foreground">{friend.name}</p>
        <p className="t-small mt-0.5 text-muted">{rankOf(friend)}</p>
        <div className="mt-5 w-full rounded-2xl bg-surface-2 px-4 py-3">
          <p className="t-display text-foreground">{friend.clubMatchesAttended}</p>
          <p className="t-small text-muted">матчей клуба посетил</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function InviteFriendSheet({ open, match, onClose }: Props) {
  useTelegramBackButton(open, onClose);
  const [query, setQuery] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<SocialFriend | null>(null);

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setQuery("");
        setSelectedFriend(null);
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const shareUrl = match?.ticketUrl ?? "https://jaiyq.app";
  const shareText = match
    ? `Смотри матч ${match.home.shortName} — ${match.away.shortName}!`
    : "Смотри матч Жайык!";

  const tgHref = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FRIENDS;
    return FRIENDS.filter((f) => f.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <AnimatePresence>
      {open && match && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col justify-end"
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal
          aria-labelledby="invite-friend-title"
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-background/70"
            aria-label="Закрыть"
            onClick={onClose}
            variants={backdrop}
          />

          <motion.div
            className="relative z-10 mx-auto flex h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-line bg-surface"
            variants={panel}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong" aria-hidden />

            <header className="flex shrink-0 items-start justify-between gap-3 px-4 pt-4">
              <div className="min-w-0">
                <h2 id="invite-friend-title" className="t-h2 text-foreground">
                  Позовите друзей на матч
                </h2>
                <p className="t-small mt-0.5 text-muted">
                  {match.home.shortName} — {match.away.shortName}
                </p>
              </div>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={onClose}
                className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted transition-colors active:text-foreground"
              >
                <X className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
              </button>
            </header>

            <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
              <a
                href={tgHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => haptic.impact("light")}
                className="flex h-[52px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-semibold text-on-accent transition-[transform,filter] duration-[120ms] active:scale-[0.97]"
              >
                <Send className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                Поделиться в Telegram
              </a>

              <div className="mt-6 flex min-h-0 flex-1 flex-col">
                <AnimatePresence mode="wait" initial={false}>
                  {selectedFriend ? (
                    <FriendDetails
                      key="card"
                      friend={selectedFriend}
                      onBack={() => setSelectedFriend(null)}
                    />
                  ) : (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <label className="relative block">
                        <span className="sr-only">Поиск друзей</span>
                        <Search
                          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-subtle"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <input
                          type="search"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Имя друга"
                          className="t-body h-11 w-full rounded-xl border border-line bg-surface-2 pl-11 pr-4 text-foreground outline-none transition-colors placeholder:text-subtle focus:border-line-strong"
                        />
                      </label>

                      <h3 className="t-h3 mt-6 text-foreground">Ваши друзья</h3>

                      {filtered.length === 0 ? (
                        <EmptyState
                          icon={<UserX className="h-6 w-6" strokeWidth={1.75} aria-hidden />}
                          title="Никого не найдено"
                          description="Проверьте имя или поделитесь ссылкой в Telegram."
                        />
                      ) : (
                        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line">
                          {filtered.map((f, i) => (
                              <motion.li
                                key={f.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  delay: Math.min(i, 5) * 0.04,
                                  duration: 0.22,
                                  ease: [0.2, 0.8, 0.2, 1],
                                }}
                                className="flex min-h-14 items-center gap-3 px-3 py-2"
                              >
                                <button
                                  type="button"
                                  onClick={() => setSelectedFriend(f)}
                                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                >
                                  <FriendAvatar friend={f} />
                                  <span className="min-w-0">
                                    <span className="t-body block truncate text-foreground">
                                      {f.name}
                                    </span>
                                    <span className="t-caption block text-muted">{rankOf(f)}</span>
                                  </span>
                                </button>
                                <Button variant="ghost" size="sm">
                                  Позвать
                                </Button>
                              </motion.li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
