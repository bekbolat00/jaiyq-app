"use client";

/* eslint-disable @next/next/no-img-element -- фото товаров могут отсутствовать; нужен onError с фолбэком на герб */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { Product } from "@/lib/types";

type Props = {
  product: Product;
  onAddToCart?: (product: Product) => void;
};

/** «24 990 ₸» — неразрывные пробелы, чтобы ₸ не уезжал на новую строку. */
export function formatPrice(kzt: number) {
  return `${kzt.toLocaleString("ru-RU").replace(/\s/g, " ")} ₸`;
}

export default function ProductCard({ product, onAddToCart }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // onError может сработать до гидратации — тогда React его не увидит.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setImageFailed(true);
    }
  }, []);
  const showImage = Boolean(product.imageUrl) && !imageFailed;

  return (
    <article className="flex flex-col">
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-surface-2">
        {showImage ? (
          <img
            ref={imgRef}
            src={product.imageUrl}
            alt={product.title}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <img
            src="/teams/zhaiyq.png"
            alt=""
            aria-hidden
            className="h-[40%] w-[40%] object-contain opacity-50"
          />
        )}
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        <p className="t-body line-clamp-2 font-medium text-foreground">{product.title}</p>
        {product.subtitle && <p className="t-caption mt-0.5 text-muted">{product.subtitle}</p>}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="t-h3 whitespace-nowrap font-sans tabular-nums text-foreground">
            {formatPrice(product.priceKzt)}
          </span>
          <motion.button
            type="button"
            aria-label={`Добавить в корзину: ${product.title}`}
            onClick={() => onAddToCart?.(product)}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-foreground transition-[filter] active:brightness-125"
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          </motion.button>
        </div>
      </div>
    </article>
  );
}
