"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ScreenHeader from "../components/ScreenHeader";
import TabEnterMotion from "../components/TabEnterMotion";
import ProductCard, { formatPrice } from "../components/ProductCard";
import Button from "../components/ui/Button";
import { PRODUCTS } from "@/lib/data/mock";
import { haptic } from "@/lib/telegram/webApp";
import type { Product } from "@/lib/types";

type Filter = "all" | Product["category"];

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "jersey", label: "Форма" },
  { id: "accessory", label: "Аксессуары" },
  { id: "merch", label: "Сувениры" },
];

export default function ShopPage() {
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");

  const handleAdd = (product: Product) => {
    haptic.impact("light");
    setCartCount((c) => c + 1);
    setCartTotal((t) => t + product.priceKzt);
  };

  const products = useMemo(
    () => (filter === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.category === filter)),
    [filter],
  );

  return (
    <>
      <TabEnterMotion className={`flex flex-col gap-4 ${cartCount > 0 ? "pb-20" : ""}`}>
        <ScreenHeader title="Магазин" />

        <div
          role="tablist"
          aria-label="Категории товаров"
          className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4"
        >
          {FILTERS.map((f) => {
            const active = f.id === filter;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  if (active) return;
                  haptic.select();
                  setFilter(f.id);
                }}
                className={`h-9 shrink-0 rounded-lg px-3.5 text-[13px] font-medium transition-colors duration-150 ${
                  active ? "bg-foreground text-background" : "bg-surface-2 text-muted"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-6">
          <AnimatePresence mode="popLayout" initial={false}>
            {products.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <ProductCard product={p} onAddToCart={handleAdd} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </TabEnterMotion>

      {/* Вне TabEnterMotion: transform у родителя ломает position: fixed. */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 104px)" }}
          >
            <div className="pointer-events-auto flex w-full max-w-[440px] items-center justify-between gap-3 rounded-2xl border border-line bg-surface py-2 pl-4 pr-2">
              <p className="t-body min-w-0 truncate text-foreground">
                <span className="tabular-nums">{cartCount}</span> {pluralize(cartCount)}
                <span className="text-subtle"> · </span>
                <span className="whitespace-nowrap font-semibold tabular-nums">
                  {formatPrice(cartTotal)}
                </span>
              </p>
              <Button size="sm">Оформить</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function pluralize(n: number) {
  const last = n % 10;
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return "товаров";
  if (last === 1) return "товар";
  if (last >= 2 && last <= 4) return "товара";
  return "товаров";
}
