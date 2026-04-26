type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export default function ScreenHeader({ eyebrow, title, subtitle }: Props) {
  return (
    <header className="mb-5 mt-3">
      {eyebrow && (
        <p className="neon-cyan text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-2 max-w-full text-balance text-[clamp(2.25rem,10.5vw,3.35rem)] font-black uppercase leading-[0.92] tracking-[0.2em] text-foreground">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-[13px] text-muted">{subtitle}</p>
      )}
    </header>
  );
}
