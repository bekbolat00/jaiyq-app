"use client";

import { motion } from "framer-motion";
import { Heart, Share2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import SectionHeader from "@/app/components/ui/SectionHeader";
import { NEWS_FEED } from "@/lib/data/mock";
import { haptic } from "@/lib/telegram/webApp";
import type { NewsFeedItem } from "@/lib/types";

/** Фото новости с запасным вариантом: при ошибке загрузки — герб на фирменном синем. */
function NewsImage({ src, className, sizes }: { src: string; className: string; sizes: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-navy/60 ${className}`}>
      {broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- локальный герб как заглушка
        <img src="/teams/zhaiyq.png" alt="" className="absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 object-contain opacity-40" />
      ) : (
        <Image src={src} alt="" fill className="object-cover" sizes={sizes} onError={() => setBroken(true)} />
      )}
    </div>
  );
}

function useNewsActions(item: NewsFeedItem) {
  const [liked, setLiked] = useState(item.isLiked);
  const [likes, setLikes] = useState(item.likesCount);

  const toggleLike = useCallback(() => {
    haptic.impact("light");
    setLiked((prev) => {
      setLikes((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  }, []);

  const share = useCallback(async () => {
    const payload = { title: item.title, text: item.description, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(payload);
      else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* пользователь отменил или не поддерживается */
    }
  }, [item.description, item.title]);

  return { liked, likes, toggleLike, share };
}

function NewsMeta({ item }: { item: NewsFeedItem }) {
  const { liked, likes, toggleLike, share } = useNewsActions(item);
  return (
    <div className="mt-2 flex items-center gap-1">
      <span className="t-caption mr-auto text-subtle">{item.date}</span>
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={toggleLike}
        aria-pressed={liked}
        aria-label={liked ? "Убрать лайк" : "Нравится"}
        className={`flex h-8 items-center gap-1.5 rounded-lg px-2 ${liked ? "text-loss" : "text-subtle"}`}
      >
        <motion.span key={String(liked)} initial={{ scale: liked ? 1.3 : 1 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
          <Heart className="h-4 w-4" strokeWidth={1.75} fill={liked ? "currentColor" : "none"} aria-hidden />
        </motion.span>
        <span className="t-caption tabular-nums">{likes}</span>
      </motion.button>
      <button type="button" onClick={share} aria-label="Поделиться" className="flex h-8 w-8 items-center justify-center rounded-lg text-subtle active:bg-surface-2">
        <Share2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}

/** Главная новость: большое фото, заголовок и мета без рамок. */
function FeaturedNews({ item }: { item: NewsFeedItem }) {
  return (
    <article>
      <NewsImage src={item.imageUrl} className="aspect-[16/10] w-full rounded-2xl" sizes="(max-width: 480px) 100vw, 480px" />
      <h3 className="t-h3 mt-3 text-foreground">{item.title}</h3>
      <p className="t-small mt-1 line-clamp-2 text-muted">{item.description}</p>
      <NewsMeta item={item} />
    </article>
  );
}

/** Остальные новости — компактные строки с миниатюрой. */
function CompactNews({ item }: { item: NewsFeedItem }) {
  return (
    <article className="flex gap-3 py-4">
      <NewsImage src={item.imageUrl} className="h-[76px] w-[96px] shrink-0 rounded-xl" sizes="96px" />
      <div className="min-w-0 flex-1">
        <h3 className="t-body line-clamp-2 font-medium text-foreground">{item.title}</h3>
        <NewsMeta item={item} />
      </div>
    </article>
  );
}

export default function NewsFeedPanel() {
  const [first, ...rest] = NEWS_FEED;
  if (!first) return null;
  return (
    <section aria-label="Новости клуба">
      <SectionHeader title="Новости" />
      <FeaturedNews item={first} />
      {rest.length > 0 && (
        <div className="mt-2 divide-y divide-line border-t border-line">
          {rest.map((item) => (
            <CompactNews key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
