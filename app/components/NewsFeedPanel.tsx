"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useState } from "react";
import { NEWS_FEED } from "@/lib/data/mock";
import type { NewsFeedItem } from "@/lib/types";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}

function NewsCard({ item, index }: { item: NewsFeedItem; index: number }) {
  const [liked, setLiked] = useState(item.isLiked);
  const [likes, setLikes] = useState(item.likesCount);

  const toggleLike = useCallback(() => {
    setLiked((prev) => {
      setLikes((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  }, []);

  const share = useCallback(async () => {
    const payload = { title: item.title, text: item.description, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      /* user cancelled or unsupported */
    }
  }, [item.description, item.title]);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.42,
        ease: [0.22, 1, 0.36, 1],
        delay: index * 0.06,
      }}
      className="glass-premium overflow-hidden rounded-2xl shadow-[0_0_32px_rgba(0,240,255,0.06)]"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl">
        <Image
          src={item.imageUrl}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 480px"
        />
      </div>
      <div className="rounded-b-2xl border border-t-0 border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <h3 className="mb-2 text-lg font-bold text-foreground">{item.title}</h3>
        <p className="line-clamp-2 text-sm text-muted">{item.description}</p>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted/90">
          {item.date}
        </p>

        <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={toggleLike}
            className={`flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold transition-colors ${
              liked
                ? "border-[#00f0ff]/40 bg-[#00f0ff]/10 text-accent"
                : "bg-white/[0.04] text-foreground/90 hover:border-white/20"
            }`}
            aria-pressed={liked}
            aria-label={liked ? "Убрать лайк" : "Поставить лайк"}
          >
            <HeartIcon filled={liked} />
            <span className="tabular-nums">{likes}</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={share}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-foreground/90 transition-colors hover:border-white/20"
            aria-label="Поделиться"
          >
            <ShareIcon />
            <span>Поделиться</span>
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}

export default function NewsFeedPanel() {
  return (
    <section className="flex flex-col gap-6" aria-label="Лента новостей">
      <h3 className="mb-0 px-0.5 text-sm font-black uppercase tracking-widest text-white/50">
        НОВОСТИ
      </h3>
      <div className="flex flex-col gap-6">
        {NEWS_FEED.map((item, index) => (
          <NewsCard key={item.id} item={item} index={index} />
        ))}
      </div>
    </section>
  );
}
