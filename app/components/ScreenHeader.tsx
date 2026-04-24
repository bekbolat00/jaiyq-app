type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export default function ScreenHeader({ eyebrow, title, subtitle }: Props) {
  return (
    <header className="mb-5 mt-3">
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-1 text-[26px] font-semibold leading-tight text-foreground">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-[13px] text-muted">{subtitle}</p>
      )}
    </header>
  );
}
