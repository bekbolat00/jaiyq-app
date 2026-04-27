import { isFieldLineRole } from "@/lib/matches/squadFromPlayerRows";
import type { LinePlayerRow } from "@/lib/matches/matchDetailFromDb";

type Line = "вр" | "зщ" | "пз" | "нп" | "oth";
type LineKey = "вр" | "зщ" | "пз" | "нп";

/**
 * `top`/`left` в % относительно зоны поля.
 * `fromTopGoal`: true — половина у ворот сверху (GK ~5%), false — снизу (GK ~95%).
 */
export function getCoordinates(
  line: Line,
  index: number,
  totalInLine: number,
  fromTopGoal: boolean,
): { top: string; left: string } {
  const leftPct =
    totalInLine > 0
      ? (100 * (index + 1)) / (totalInLine + 1)
      : 50;
  const baseTop = (() => {
    if (fromTopGoal) {
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

/** Подпись схемы над логотипом (по линиям вр/зщ/пз/нп). */
export function formationLabelFromStarters(
  starters: LinePlayerRow[],
): string {
  const g = groupStartersByFieldLine(starters.slice(0, 11));
  const nG = (g.get("вр") ?? []).length;
  const nD = (g.get("зщ") ?? []).length;
  const nM = (g.get("пз") ?? []).length;
  const nF = (g.get("нп") ?? []).length;
  if (nD + nM + nF === 0 && nG === 0) return "—";
  if (nG > 1) return [nG, nD, nM, nF].filter((n) => n > 0).join("-");
  if (nD === 4 && nM === 5 && nF === 1) return "4-2-3-1";
  if (nD === 4 && nM === 4 && nF === 2) return "4-4-2";
  if (nD === 4 && nM === 3 && nF === 3) return "4-3-3";
  if (nD === 3 && nM === 5 && nF === 2) return "3-5-2";
  if (nD === 5 && nM === 3 && nF === 2) return "5-3-2";
  const parts = [nD, nM, nF].filter((n) => n > 0);
  return parts.length ? parts.join("-") : "—";
}
