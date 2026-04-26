"use client";

import { useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import TabEnterMotion from "../components/TabEnterMotion";
import ProductCard from "../components/ProductCard";
import { PRODUCTS } from "@/lib/data/mock";

export default function ShopPage() {
  const [cartCount, setCartCount] = useState(0);

  const handleAdd = () => {
    setCartCount((c) => c + 1);
  };

  return (
    <TabEnterMotion className="flex flex-col gap-5">
      <ScreenHeader
        eyebrow="Официальный мерч"
        title="Магазин"
        subtitle="Джерси, аксессуары, лимитированные коллекции"
      />

      <div className="glass flex items-center justify-between rounded-2xl px-4 py-3">
        <div>
          <p className="text-[12px] text-muted">Корзина</p>
          <p className="text-[15px] font-semibold text-foreground">
            {cartCount} {pluralize(cartCount)}
          </p>
        </div>
        <button
          type="button"
          className="neon-cyan rounded-xl border border-accent/45 bg-accent/10 px-4 py-2 text-[13px] font-bold text-accent transition-colors hover:bg-accent/20"
        >
          Оформить
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PRODUCTS.map((p) => (
          <ProductCard key={p.id} product={p} onAddToCart={handleAdd} />
        ))}
      </div>
    </TabEnterMotion>
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
