"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { Match, SocialFriend } from "@/lib/types";
import { FRIENDS } from "@/lib/data/mock";

type Props = {
  open: boolean;
  match: Match | null;
  onClose: () => void;
};

const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const panel = {
  hidden: { y: 24, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 380, damping: 32 },
  },
  exit: { y: 16, opacity: 0, transition: { duration: 0.2 } },
};

function FriendAvatar({ friend }: { friend: SocialFriend }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = friend.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  if (friend.avatarUrl && !imgFailed) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10">
        <Image
          src={friend.avatarUrl}
          alt=""
          width={48}
          height={48}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-gradient-to-br from-accent/25 to-accent/5 font-mono text-sm font-bold text-accent">
      {initials}
    </div>
  );
}

function FriendMiniCard({
  friend,
  onBack,
}: {
  friend: SocialFriend;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="glass-premium space-y-4 rounded-2xl p-4"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-[12px] font-bold uppercase tracking-wider text-accent"
        >
          ← Назад
        </button>
      </div>
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div
            className="absolute -inset-0.5 rounded-full"
            style={{
              background: "linear-gradient(135deg, #00f0ff, rgba(0,240,255,0.2))",
            }}
          />
          <div className="relative rounded-full p-[2px]">
            <div className="overflow-hidden rounded-full bg-[#020408]">
              {friend.avatarUrl ? (
                <div className="relative h-24 w-24">
                  <Image
                    src={friend.avatarUrl}
                    alt=""
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center bg-gradient-to-br from-white/10 to-transparent font-mono text-2xl font-bold text-accent">
                  {friend.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 text-lg font-bold text-foreground">{friend.name}</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-accent">
          {friend.isPro ? "PRO" : friend.rankLabel}
        </p>
        <p className="mt-2 text-2xl font-black tabular-nums text-foreground">
          {friend.followersCount}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
          подписчиков
        </p>
        <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] text-foreground/90">
          Посетил{" "}
          <span className="font-black text-accent">{friend.clubMatchesAttended}</span>{" "}
          матчей клуба
        </p>
      </div>
    </motion.div>
  );
}

export default function InviteFriendSheet({ open, match, onClose }: Props) {
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
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal
          aria-labelledby="invite-friend-title"
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-[#020408]/80 backdrop-blur-sm"
            aria-label="Закрыть"
            onClick={onClose}
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
          />

          <motion.div
            className="glass-premium relative z-10 flex h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl"
            style={{ backgroundColor: "rgba(2, 4, 8, 0.96)" }}
            variants={panel}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Закрыть"
              onClick={onClose}
              className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-foreground backdrop-blur-md transition-colors hover:bg-black/55"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>

            <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 pt-12">
              <h1
                id="invite-friend-title"
                className="pr-10 text-center text-lg font-black uppercase leading-tight tracking-tight text-foreground"
              >
                Позовите друзей на матч
              </h1>
              <p className="mt-1.5 text-center text-[11px] uppercase tracking-widest text-muted">
                {match.home.shortName} — {match.away.shortName}
              </p>

              <div className="mt-5">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Введите имя друга"
                  className="w-full rounded-xl border border-white/10 bg-[#020408] px-4 py-3.5 text-[15px] text-foreground placeholder:text-muted outline-none transition-[box-shadow] focus:neon-cyan-surface focus:ring-1 focus:ring-accent/40"
                />
              </div>

              <a
                href={tgHref}
                target="_blank"
                rel="noopener noreferrer"
                className="neon-cyan-surface mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-4 text-center text-sm font-black uppercase tracking-[0.1em] text-[#020408] transition-[transform,filter] active:scale-[0.99] active:brightness-95"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 shrink-0"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.05-.2-.07-.05-.16-.04-.24-.02-.1.04-1.7 1.1-4.8 3.2-.45.3-.86.45-1.22.45-.4-.01-1.18-.22-1.75-.4-.7-.2-1.25-.3-1.2-.64.02-.19.3-.4.8-.6 3.1-1.3 4.1-1.5 4.2-1.5.1-.02.22 0 .3.1.1.1.1.2.1.3 0 0 0 1.1-.02 1.1z" />
                </svg>
                Поделиться ссылкой в Telegram
              </a>

              <div className="mt-6 flex min-h-0 flex-1 flex-col gap-3">
                <AnimatePresence mode="wait">
                  {selectedFriend ? (
                    <FriendMiniCard
                      key="card"
                      friend={selectedFriend}
                      onBack={() => setSelectedFriend(null)}
                    />
                  ) : (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-2"
                    >
                      <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                        Твои друзья
                      </p>
                      {filtered.map((f, i) => (
                        <motion.div
                          key={f.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.04 * i, duration: 0.25 }}
                          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedFriend(f)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <FriendAvatar friend={f} />
                            <div className="min-w-0">
                              <p className="truncate text-[15px] font-semibold text-foreground">
                                {f.name}
                              </p>
                              <p className="text-[11px] font-bold uppercase tracking-wide text-accent/90">
                                {f.isPro ? "PRO" : f.rankLabel}
                              </p>
                            </div>
                          </button>
                          <button
                            type="button"
                            className="shrink-0 rounded-full border border-accent px-4 py-1.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            Позвать
                          </button>
                        </motion.div>
                      ))}
                      {filtered.length === 0 && (
                        <p className="py-4 text-center text-sm text-muted">Никого не найдено</p>
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
