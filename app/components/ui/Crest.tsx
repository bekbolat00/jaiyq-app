/* eslint-disable @next/next/no-img-element -- логотипы с разных доменов, next/image тут не помогает */

type Props = {
  src: string | null | undefined;
  alt?: string;
  /** Размер круга в px. Логотип занимает ~72% диаметра. */
  size?: number;
  className?: string;
};

/** Логотип команды в спокойном круге — одинаковый визуальный вес у всех клубов. */
export default function Crest({ src, alt = "", size = 40, className = "" }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2 ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={alt} className="object-contain" style={{ width: size * 0.72, height: size * 0.72 }} />
      ) : null}
    </span>
  );
}
