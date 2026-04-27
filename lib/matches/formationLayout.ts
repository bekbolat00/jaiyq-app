import { isFieldLineRole } from "@/lib/matches/squadFromPlayerRows";
import type { LinePlayerRow } from "@/lib/matches/matchDetailFromDb";

type Line = "вр" | "зщ" | "пз" | "нп" | "oth";
type LineKey = "вр" | "зщ" | "пз" | "нп";

function shirtOrderKey(p: LinePlayerRow): number {
  const n = Number.parseInt(String(p.num).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 999;
}

/**
 * `top`/`left` в % относительно **всего** блока поля (внешний контейнер).
 * `fromTopGoal`: true — ворота сверху; false — ворота снизу.
 * Внутри линии одинаковый `top`, по горизонтали — равномерно.
 */
export function getCoordinates(
  line: Line,
  index: number,
  totalInLine: number,
  fromTopGoal: boolean,
): { top: string; left: string } {
  const leftPct =
    totalInLine > 0 ? (100 * (index + 1)) / (totalInLine + 1) : 50;
  const baseTop = (() => {
    if (fromTopGoal) {
      if (line === "вр") return 8;
      if (line === "зщ") return 22;
      if (line === "пз") return 45;
      if (line === "нп") return 68;
      return 45;
    }
    if (line === "вр") return 92;
    if (line === "зщ") return 78;
    if (line === "пз") return 55;
    if (line === "нп") return 32;
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
  for (const arr of m.values()) {
    arr.sort((a, b) => shirtOrderKey(a) - shirtOrderKey(b));
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
