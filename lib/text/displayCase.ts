/**
 * «ИВАНОВ ИВАН» → «Иванов Иван». Имена и названия из протоколов KFF часто
 * приходят капсом; текст в обычном регистре оставляем как есть.
 */
export function displayCase(value: string): string {
  const s = value.trim();
  if (!s || s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s\-'])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** «ЗАВЕРШЁН» → «Завершён». */
export function sentenceCase(value: string): string {
  const s = value.trim().toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}
