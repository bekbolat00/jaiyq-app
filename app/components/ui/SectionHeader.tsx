import type { ReactNode } from "react";

type Props = {
  title: string;
  /** Необязательное действие справа, например ссылка «Все». */
  action?: ReactNode;
  className?: string;
};

export default function SectionHeader({ title, action, className = "" }: Props) {
  return (
    <div className={`mb-3 flex items-end justify-between gap-3 ${className}`}>
      <h2 className="t-h2 text-foreground">{title}</h2>
      {action}
    </div>
  );
}

/** Текстовое действие в шапке секции: «Все», «Подробнее». */
export function SectionAction({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="t-small -mr-2 rounded-lg px-2 py-1 font-medium text-accent transition-colors active:bg-accent/[0.08]"
    >
      {children}
    </button>
  );
}
