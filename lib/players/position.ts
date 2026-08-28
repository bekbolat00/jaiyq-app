const POSITION_FULL_LABELS: Record<string, string> = {
  вр: "Вратарь",
  зщ: "Защитник",
  пз: "Полузащитник",
  нп: "Нападающий",
  тр: "Тренер",
};

/** Код позиции (`вр`/`зщ`/`пз`/`нп`, любым регистром) -> полное слово для UI. */
export function positionFullLabel(pos: string): string {
  const key = pos.trim().toLowerCase();
  return POSITION_FULL_LABELS[key] ?? pos;
}
