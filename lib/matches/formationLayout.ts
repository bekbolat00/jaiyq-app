import { isFieldLineRole } from "@/lib/matches/squadFromPlayerRows";
import type { LinePlayerRow } from "@/lib/matches/matchDetailFromDb";

type Line = "вр" | "зщ" | "пз" | "нп" | "oth";
type LineKey = "вр" | "зщ" | "пз" | "нп";

/**
 * `top`/`left` в % относительно зоны поля, хозяева снизу, гости сверху.
 */
export function getCoordinates(
  line: Line,
  index: number,
  totalInLine: number,
  isAway: boolean,
): { top: string; left: string } {
  const leftPct =
    totalInLine > 0
      ? (100 * (index + 1)) / (totalInLine + 1)
      : 50;
  const baseTop = (() => {
    if (isAway) {
      if (line === "вр") return 5;
      if (line === "зщ") return 20;
      if (line === "пз") return 40;
      if (line === "нп") {
        if (totalInLine <= 1) return 65;
        return 60 + (index * 7) / Math.max(1, totalInLine - 1);
      }
      return 45;
    }
    if (line === "вр") return 95;
    if (line === "зщ") return 80;
    if (line === "пз") return 60;
    if (line === "нп") {
      if (totalInLine <= 1) return 35;
      return 38 - (index * 6) / Math.max(1, totalInLine - 1);
    }
    return 55;
  })();
  return { top: `${baseTop}%`, left: `${leftPct}%` };
}

export function groupStartersByFieldLine(
  starters: LinePlayerRow[],
): Map<LineKey, LinePlayerRow[]> {
  const m = new Map<LineKey, LinePlayerRow[]>();
  for (const s of starters.slice(0, 11)) {
    const line = isFieldLineRole(s.pos);
    const k: LineKey = line === "oth" ? "пз" : (line as LineKey);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(s);
  }
  return m;
}
