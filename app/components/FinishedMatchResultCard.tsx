"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { ResultBadge, outcomeFor } from "@/app/components/ui/Badges";
import Crest from "@/app/components/ui/Crest";
import { TEAM_ZHAIYQ } from "@/lib/constants/zhaiyq";
import type { DbMatchRow } from "@/lib/types";

type Props = {
  row: DbMatchRow;
  index?: number;
  /** Открыть матч-центр. */
  onAboutMatch?: () => void;
  /**
   * Строка внутри общей поверхности списка (родитель рисует карточку и
   * разделители). Без флага строка сама является карточкой.
   */
  grouped?: boolean;
};

function shortDate(iso: string) {
  const d = new Date(iso);
  return {
    day: d.getDate(),
    month: d.toLocaleDateString("ru-RU", { month: "short" }).replace(".", ""),
  };
}

/** Результат матча строкой: дата · соперник · счёт · В/Н/П. */
export default function FinishedMatchResultCard({ row, index = 0, onAboutMatch, grouped = false }: Props) {
  const { day, month } = shortDate(row.match_date);
  const zs = row.zhaiyq_score;
  const os = row.opponent_score;
  const home = row.is_home ? zs : os;
  const away = row.is_home ? os : zs;
  const outcome = outcomeFor(zs, os);
  const Tag = onAboutMatch ? motion.button : motion.div;

  return (
    <Tag
      type={onAboutMatch ? "button" : undefined}
      role="listitem"
      onClick={onAboutMatch}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1], delay: 0.04 * Math.min(index, 5) }}
      whileTap={onAboutMatch ? { backgroundColor: "rgba(150,180,255,0.06)" } : undefined}
      aria-label={
        onAboutMatch
          ? `${row.is_home ? "Жайык" : row.opponent} ${home ?? "–"}:${away ?? "–"} ${row.is_home ? row.opponent : "Жайык"}, открыть матч`
          : undefined
      }
      className={`flex w-full items-center gap-3 px-4 py-3 text-left ${grouped ? "" : "card"}`}
    >
      <div className="flex w-9 shrink-0 flex-col items-center">
        <span className="t-h3 tabular-nums text-foreground">{day}</span>
        <span className="t-caption -mt-0.5 text-subtle">{month}</span>
      </div>

      <Crest src={row.logo_url?.trim() || null} size={36} />

      <div className="min-w-0 flex-1">
        <p className="t-body truncate font-medium text-foreground">{row.opponent}</p>
        <p className="t-caption truncate text-muted">{row.is_home ? "Дома" : "В гостях"}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <span className="t-h3 tabular-nums text-foreground">
          {home ?? "–"}
          <span className="px-0.5 text-subtle">:</span>
          {away ?? "–"}
        </span>
        {outcome && <ResultBadge outcome={outcome} />}
        {onAboutMatch && <ChevronRight className="-mr-1 h-4 w-4 text-subtle" strokeWidth={1.75} aria-hidden />}
      </div>
    </Tag>
  );
}

// Сохраняем экспорт на случай старых импортов логотипа клуба.
export { TEAM_ZHAIYQ };
