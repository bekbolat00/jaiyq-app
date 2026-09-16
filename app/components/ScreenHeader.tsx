type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

/** Заголовок экрана: крупный, спокойный, обычным регистром. */
export default function ScreenHeader({ eyebrow, title, subtitle }: Props) {
  return (
    <header className="mb-2 mt-4">
      {eyebrow && <p className="t-label mb-1.5 text-subtle">{eyebrow}</p>}
      <h1 className="t-h1 text-balance text-foreground">{title}</h1>
      {subtitle && <p className="t-small mt-1 text-muted">{subtitle}</p>}
    </header>
  );
}
