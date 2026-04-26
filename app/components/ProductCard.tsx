"use client";

import type { Product } from "@/lib/types";

type Props = {
  product: Product;
  onAddToCart?: (product: Product) => void;
};

export default function ProductCard({ product, onAddToCart }: Props) {
  return (
    <article className="glass-premium flex flex-col overflow-hidden rounded-2xl">
      <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-white/[0.06] to-transparent">
        <div className="absolute inset-0 flex items-center justify-center text-white/15">
          <ProductIcon category={product.category} />
        </div>
        <span className="neon-cyan absolute left-3 top-3 rounded-md border border-white/10 bg-black/50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-accent backdrop-blur-md">
          {labelForCategory(product.category)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-h-[40px]">
          <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-foreground">
            {product.title}
          </p>
          {product.subtitle && (
            <p className="mt-0.5 text-[11px] text-muted">{product.subtitle}</p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="font-mono text-[14px] font-semibold text-foreground">
            {product.priceKzt.toLocaleString("ru-RU")} ₸
          </span>
          <button
            type="button"
            onClick={() => onAddToCart?.(product)}
            className="neon-cyan inline-flex items-center gap-1 rounded-xl border border-accent/45 bg-accent/10 px-3 py-1.5 text-[12px] font-bold text-accent transition-colors hover:bg-accent/20"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M4 7h16l-1.2 11.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 7Z" />
              <path d="M9 7a3 3 0 1 1 6 0" />
            </svg>
            В корзину
          </button>
        </div>
      </div>
    </article>
  );
}

function labelForCategory(c: Product["category"]) {
  if (c === "jersey") return "Jersey";
  if (c === "merch") return "Merch";
  return "Access.";
}

function ProductIcon({ category }: { category: Product["category"] }) {
  if (category === "jersey") {
    return (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-24 w-24">
        <path d="M22 10 16 18l-6 2 2 10 6-2v26h28V28l6 2 2-10-6-2-6-8-4 4a8 8 0 0 1-12 0l-4-4Z" />
      </svg>
    );
  }
  if (category === "accessory") {
    return (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-24 w-24">
        <path d="M8 40c0-13 11-22 24-22s24 9 24 22v4H8v-4Z" />
        <path d="M4 44h56" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-24 w-24">
      <rect x="12" y="18" width="40" height="32" rx="4" />
      <path d="M20 18v-4h24v4" />
    </svg>
  );
}
