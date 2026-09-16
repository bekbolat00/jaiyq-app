"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Crest from "@/app/components/ui/Crest";

// three.js (~150 КБ) нужен только главной карточке — грузим отдельным чанком.
const Crest3DScene = dynamic(() => import("@/app/components/Crest3DScene"), { ssr: false });

type Props = {
  src: string | null;
  size?: number;
  delay?: number;
  from?: -1 | 1;
};

function canUse3D(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Логотип команды 3D-монетой: влетает с разворотом, покачивается и
 * наклоняется за пальцем. Без WebGL или при «уменьшить движение» —
 * обычный плоский логотип.
 */
export default function Crest3D({ src, size = 96, delay = 0, from = -1 }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Возможность WebGL известна только в браузере.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(Boolean(src) && canUse3D());
  }, [src]);

  // Останавливаем отрисовку, когда карточка ушла с экрана или приложение свернули.
  useEffect(() => {
    const el = box.current;
    if (!el || !enabled) return;
    let onScreen = true;
    const sync = () => setVisible(onScreen && document.visibilityState === "visible");
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [enabled]);

  return (
    <div ref={box} className="relative" style={{ width: size, height: size }}>
      {/* Мягкая тень под монетой — ощущение, что она парит над карточкой. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%]"
        style={{
          bottom: -size * 0.06,
          width: size * 0.62,
          height: size * 0.12,
          background: "radial-gradient(closest-side, rgba(0,0,0,0.55), rgba(0,0,0,0))",
        }}
      />
      {enabled && src ? (
        <div className="absolute" style={{ inset: -size * 0.14 }}>
          <Crest3DScene src={src} delay={delay} from={from} paused={!visible} />
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Crest src={src} size={size * 0.72} className="bg-white/[0.06]" />
        </div>
      )}
    </div>
  );
}
