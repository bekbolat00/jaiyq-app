"use client";

import { motion } from "framer-motion";
import type { LiveMatchStatsShape } from "@/lib/data/mock";

const RADAR_LABELS = [
  { line: "Удары", sub: "атака" },
  { line: "Владение", sub: "контроль" },
  { line: "Сэйвы", sub: "оборона" },
  { line: "Угловые", sub: "стандарты" },
  { line: "Дисциплина", sub: "меньше ЖК" },
] as const;

const N = RADAR_LABELS.length;
const CX = 140;
const CY = 112;
const R = 70;

function normPair(h: number, a: number): { h: number; a: number } {
  const m = Math.max(h, a, 1e-6);
  return { h: h / m, a: a / m };
}

function normDiscipline(h: number, a: number): { h: number; a: number } {
  const m = Math.max(h, a, 1);
  return { h: (m - h) / m, a: (m - a) / m };
}

function radarSeries(stats: LiveMatchStatsShape, side: "home" | "away"): number[] {
  const { h: atk, a: atkA } = normPair(stats.shots.home, stats.shots.away);
  const ctrlH = (stats.possession.home ?? 0) / 100;
  const ctrlA = (stats.possession.away ?? 0) / 100;
  const { h: def, a: defA } = normPair(stats.saves.home, stats.saves.away);
  const { h: std, a: stdA } = normPair(stats.corners.home, stats.corners.away);
  const { h: discH, a: discA } = normDiscipline(
    stats.yellowCards.home,
    stats.yellowCards.away,
  );
  if (side === "home") {
    return [atk, ctrlH, def, std, discH];
  }
  return [atkA, ctrlA, defA, stdA, discA];
}

function polygonPoints(values: number[]): string {
  return values
    .map((v, i) => {
      const clamped = Math.min(1, Math.max(0, v));
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
      const x = CX + R * clamped * Math.cos(angle);
      const y = CY + R * clamped * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(" ");
}

function gridPolygons(): string[] {
  const rings = [0.25, 0.5, 0.75, 1];
  return rings.map((t) =>
    Array.from({ length: N }, (_, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
      const x = CX + R * t * Math.cos(angle);
      const y = CY + R * t * Math.sin(angle);
      return `${x},${y}`;
    }).join(" "),
  );
}

type BarKey = keyof Pick<
  LiveMatchStatsShape,
  | "possession"
  | "shots"
  | "shotsOnTarget"
  | "corners"
  | "offsides"
  | "saves"
  | "yellowCards"
>;

const BAR_ROWS: { key: BarKey; label: string }[] = [
  { key: "possession", label: "Владение" },
  { key: "shots", label: "Удары" },
  { key: "shotsOnTarget", label: "Удары в створ" },
  { key: "corners", label: "Угловые" },
  { key: "offsides", label: "Оффсайды" },
  { key: "saves", label: "Сэйвы" },
  { key: "yellowCards", label: "ЖК" },
];

type Props = {
  stats: LiveMatchStatsShape;
  homeName: string;
  awayName: string;
  zhaiyqIsHome: boolean;
};

export default function MatchDetailStatsPanel({
  stats,
  homeName,
  awayName,
  zhaiyqIsHome,
}: Props) {
  const homePoly = polygonPoints(radarSeries(stats, "home"));
  const awayPoly = polygonPoints(radarSeries(stats, "away"));
  const grids = gridPolygons();

  const homeStroke = zhaiyqIsHome ? "#00f0ff" : "#fecaca";
  const awayStroke = zhaiyqIsHome ? "#fca5a5" : "#00f0ff";
  const homeFill = zhaiyqIsHome ? "rgba(0,240,255,0.28)" : "rgba(220,38,38,0.34)";
  const awayFill = zhaiyqIsHome ? "rgba(220,38,38,0.34)" : "rgba(0,240,255,0.28)";

  const homeBarFrom = zhaiyqIsHome ? "rgba(0,240,255,0.92)" : "rgba(248,113,113,0.95)";
  const awayBarTo = zhaiyqIsHome ? "rgba(248,113,113,0.9)" : "rgba(0,240,255,0.92)";

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,240,255,0.1),transparent_55%)]" />
        <div className="relative px-2 pb-1 pt-3 sm:px-3">
          <p className="text-center text-[8px] font-black uppercase tracking-[0.22em] text-white/40">
            Паутинка — 5 параметров
          </p>
          <svg
            viewBox="0 0 280 232"
            className="mx-auto mt-1 h-auto w-full max-w-[min(100%,320px)]"
            role="img"
            aria-label="Радарная диаграмма статистики двух команд"
          >
            <defs>
              <filter id="matchRadarGlow" x="-35%" y="-35%" width="170%" height="170%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {grids.map((pts, i) => (
              <polygon
                key={i}
                points={pts}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              />
            ))}
            {Array.from({ length: N }, (_, i) => {
              const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
              const x2 = CX + R * Math.cos(angle);
              const y2 = CY + R * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={CX}
                  y1={CY}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth={1}
                />
              );
            })}
            <motion.polygon
              points={awayPoly}
              fill={awayFill}
              stroke={awayStroke}
              strokeWidth={1.5}
              strokeLinejoin="round"
              filter="url(#matchRadarGlow)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.polygon
              points={homePoly}
              fill={homeFill}
              stroke={homeStroke}
              strokeWidth={1.5}
              strokeLinejoin="round"
              filter="url(#matchRadarGlow)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            />
            {RADAR_LABELS.map((lab, i) => {
              const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
              const lr = R + 26;
              const tx = CX + lr * Math.cos(angle);
              const ty = CY + lr * Math.sin(angle);
              const anchor =
                Math.abs(Math.cos(angle)) < 0.35 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
              return (
                <text
                  key={lab.line}
                  x={tx}
                  y={ty - 4}
                  textAnchor={anchor}
                  className="fill-white/55 [font-size:8.5px] font-bold"
                >
                  {lab.line}
                </text>
              );
            })}
            {RADAR_LABELS.map((lab, i) => {
              const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
              const lr = R + 26;
              const tx = CX + lr * Math.cos(angle);
              const ty = CY + lr * Math.sin(angle);
              const anchor =
                Math.abs(Math.cos(angle)) < 0.35 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
              return (
                <text
                  key={`${lab.line}-sub`}
                  x={tx}
                  y={ty + 7}
                  textAnchor={anchor}
                  className="fill-white/32 [font-size:6.5px] font-semibold uppercase tracking-tight"
                >
                  {lab.sub}
                </text>
              );
            })}
          </svg>
          <div className="mb-2 flex justify-center gap-6 pb-1 text-[9px] font-bold uppercase tracking-wide">
            <span className="flex items-center gap-1.5 text-white/85">
              <span
                className={`h-2 w-2 rounded-full shadow-[0_0_8px_rgba(248,113,113,0.45)] ${
                  zhaiyqIsHome
                    ? "bg-gradient-to-br from-[#00f0ff] to-[#0088aa]"
                    : "bg-gradient-to-br from-rose-300 to-red-600"
                }`}
              />
              {homeName}
            </span>
            <span className="flex items-center gap-1.5 text-accent">
              <span
                className={`h-2 w-2 rounded-full shadow-[0_0_10px_rgba(0,240,255,0.4)] ${
                  zhaiyqIsHome
                    ? "bg-gradient-to-br from-rose-300 to-red-600"
                    : "bg-gradient-to-br from-[#00f0ff] to-[#0088aa]"
                }`}
              />
              {awayName}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-center text-[8px] font-black uppercase tracking-[0.2em] text-white/35">
          Показатели матча
        </p>
        {BAR_ROWS.map((row, index) => {
          const pair = stats[row.key];
          const home = pair.home;
          const away = pair.away;
          const total = home + away || 1;
          const homeShare = (home / total) * 100;
          const awayShare = (away / total) * 100;

          return (
            <div key={row.key} className="space-y-1.5">
              <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-white/85">
                {row.label}
              </p>
              <div className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-right text-[12px] font-bold tabular-nums text-white/90">
                  {home}
                </span>
                <div className="relative flex min-h-[11px] min-w-0 flex-1 overflow-hidden rounded-full border border-white/[0.08] bg-black/30 shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] backdrop-blur-sm">
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 right-0 opacity-[0.65]"
                    style={{
                      background: `linear-gradient(90deg, ${homeBarFrom} 0%, transparent 46%, transparent 54%, ${awayBarTo} 100%)`,
                    }}
                  />
                  <div className="relative z-[1] flex min-w-0 flex-1 items-center">
                    <div className="flex h-2.5 min-w-0 flex-1 justify-end overflow-hidden rounded-l-full">
                      <motion.div
                        className={`h-full rounded-l-full bg-gradient-to-l to-transparent ${
                          zhaiyqIsHome
                            ? "from-cyan-300/60"
                            : "from-rose-300/65"
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${homeShare}%` }}
                        transition={{
                          duration: 0.85,
                          ease: [0.22, 1, 0.36, 1],
                          delay: 0.05 + index * 0.045,
                        }}
                      />
                    </div>
                    <div className="flex h-2.5 min-w-0 flex-1 justify-start overflow-hidden rounded-r-full">
                      <motion.div
                        className={`h-full rounded-r-full bg-gradient-to-r to-transparent ${
                          zhaiyqIsHome
                            ? "from-rose-400/60"
                            : "from-cyan-300/60"
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${awayShare}%` }}
                        transition={{
                          duration: 0.85,
                          ease: [0.22, 1, 0.36, 1],
                          delay: 0.09 + index * 0.045,
                        }}
                        style={{
                          boxShadow: zhaiyqIsHome
                            ? "0 0 10px rgba(248, 113, 113, 0.2)"
                            : "0 0 12px rgba(0, 240, 255, 0.25)",
                        }}
                      />
                    </div>
                  </div>
                </div>
                <span className="w-8 shrink-0 text-left text-[12px] font-bold tabular-nums text-accent">
                  {away}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
