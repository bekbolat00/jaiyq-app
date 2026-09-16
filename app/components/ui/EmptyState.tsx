import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

/** Пустое состояние/ошибка внутри секции: иконка, текст и следующий шаг. */
export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-muted">
        {icon}
      </span>
      <p className="t-h3 text-foreground">{title}</p>
      {description && <p className="t-small mt-1 max-w-[280px] text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
