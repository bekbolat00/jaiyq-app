/**
 * Три волны из герба клуба (река Жайык). Фирменный декор вместо абстрактных
 * размытых пятен — только для hero матча, шапки профиля и пустых состояний.
 */
export default function BrandWaves({ className = "", opacity = 0.3 }: { className?: string; opacity?: number }) {
  return (
    <svg
      viewBox="0 0 400 120"
      preserveAspectRatio="none"
      className={`pointer-events-none ${className}`}
      style={{ opacity }}
      aria-hidden
    >
      <path
        d="M0 38 C 50 10, 90 10, 133 38 S 216 66, 266 38 S 350 10, 400 38"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M0 70 C 50 42, 90 42, 133 70 S 216 98, 266 70 S 350 42, 400 70"
        fill="none"
        stroke="var(--wave)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M0 102 C 50 74, 90 74, 133 102 S 216 130, 266 102 S 350 74, 400 102"
        fill="none"
        stroke="var(--deep)"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
