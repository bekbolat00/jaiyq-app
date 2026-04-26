"use client";

import { useMemo } from "react";

type Props = {
  value: string;
  size?: number;
  /** Module grid size. 21 = Version 1 look; we use a stylised 25x25 for MVP. */
  gridSize?: number;
};

/**
 * Lightweight, visually-styled QR placeholder (deterministic pattern from `value`).
 * NOT a real QR encoder — for MVP rendering only. Swap with a real QR lib
 * (e.g. `qrcode`) when wiring to the ticketing backend.
 */
export default function QrCode({ value, size = 160, gridSize = 25 }: Props) {
  const cells = useMemo(() => buildPattern(value, gridSize), [value, gridSize]);

  const cellSize = size / gridSize;

  return (
    <div
      className="neon-cyan relative overflow-hidden rounded-2xl bg-white p-2 shadow-[0_0_0_1px_rgba(0,240,255,0.45),0_0_32px_-2px_rgba(0,240,255,0.6),inset_0_0_0_2px_rgba(255,255,255,0.65)]"
      style={{ width: size, height: size }}
      aria-label={`QR код ${value}`}
    >
      <svg width={size - 16} height={size - 16} viewBox={`0 0 ${size} ${size}`}>
        {cells.map((row, y) =>
          row.map((on, x) =>
            on ? (
              <rect
                key={`${x}-${y}`}
                x={x * cellSize}
                y={y * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#020408"
              />
            ) : null,
          ),
        )}
      </svg>
    </div>
  );
}

function buildPattern(value: string, n: number): boolean[][] {
  const seed = hash(value);
  const grid: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));

  // finder patterns (corners) — classic QR look
  const finders: [number, number][] = [
    [0, 0],
    [n - 7, 0],
    [0, n - 7],
  ];
  for (const [fx, fy] of finders) {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const onRing = x === 0 || y === 0 || x === 6 || y === 6;
        const onCenter = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        grid[fy + y][fx + x] = onRing || onCenter;
      }
    }
  }

  // pseudo-random data modules
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (inFinderArea(x, y, n)) continue;
      grid[y][x] = rand() > 0.5;
    }
  }
  return grid;
}

function inFinderArea(x: number, y: number, n: number): boolean {
  return (
    (x < 8 && y < 8) ||
    (x >= n - 8 && y < 8) ||
    (x < 8 && y >= n - 8)
  );
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}
