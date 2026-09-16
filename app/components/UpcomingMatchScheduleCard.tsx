"use client";

import { motion } from "framer-motion";
import { BellRing, Check, ChevronRight, Target, Ticket } from "lucide-react";
import { useState } from "react";
import BuyTicketModal from "@/app/components/BuyTicketModal";
import MatchScheduleCountdown from "@/app/components/MatchScheduleCountdown";
import { LiveGoals, LiveScoreCenter } from "@/app/components/LiveScore";
import BrandWaves from "@/app/components/ui/BrandWaves";
import Button from "@/app/components/ui/Button";
import Crest from "@/app/components/ui/Crest";
import Crest3D from "@/app/components/Crest3D";
import { useLiveMatch } from "@/app/hooks/useLiveMatch";
import { useMatchNotifications } from "@/app/hooks/useMatchNotifications";
import { TEAM_ZHAIYQ } from "@/lib/constants/zhaiyq";
import { formatKickoff, matchTitle } from "@/lib/matches/formatKickoff";
import type { DbMatchRow } from "@/lib/types";

type Props = {
  row: DbMatchRow;
  index?: number;
  onExpertClick: () => void;
  /** Вызывается после финального свистка, чтобы перечитать список матчей. */
  onLiveFinished?: () => void;
  /**
   * `hero` — главная карточка ближайшего матча на главной;
   * `compact` — строка в списке расписания.
   */
  variant?: "hero" | "compact";
};

const DAY_MS = 24 * 60 * 60 * 1000;

function sides(row: DbMatchRow) {
  const opponent = { name: row.opponent, logo: row.logo_url?.trim() || null };
  const zhaiyq = { name: "Жайык", logo: TEAM_ZHAIYQ.logoUrl };
  return row.is_home ? { home: zhaiyq, away: opponent } : { home: opponent, away: zhaiyq };
}

function monthShort(d: Date) {
  return d.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "");
}

export default function UpcomingMatchScheduleCard({
  row,
  index = 0,
  onExpertClick,
  onLiveFinished,
  variant = "compact",
}: Props) {
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const live = useLiveMatch(row, onLiveFinished);
  // Секундный таймер имеет смысл только в день матча; за три недели до игры
  // показываем дату.
  const [openedAt] = useState(() => Date.now());
  const kickoff = new Date(row.match_date);
  const kickoffSoon = kickoff.getTime() - openedAt < DAY_MS;
  const { home, away } = sides(row);

  const ticketModal = row.is_home ? (
    <BuyTicketModal
      isOpen={ticketModalOpen}
      onClose={() => setTicketModalOpen(false)}
      matchId={row.id}
      matchTitle={matchTitle(row)}
      kickoffAt={row.match_date}
    />
  ) : null;

  if (variant === "compact") {
    return (
      <motion.article
        role="listitem"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1], delay: 0.04 * Math.min(index, 5) }}
        className="card p-4"
      >
        <div className="flex items-center gap-4">
          <div className="flex w-11 shrink-0 flex-col items-center">
            <span className="t-h2 tabular-nums text-foreground">{kickoff.getDate()}</span>
            <span className="t-caption text-subtle">{monthShort(kickoff)}</span>
          </div>
          <div className="h-10 w-px shrink-0 bg-line" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Crest src={row.is_home ? away.logo : home.logo} size={24} />
              <p className="t-body truncate font-medium text-foreground">{matchTitle(row)}</p>
            </div>
            <p className="t-caption mt-1 text-muted">
              {live ? (
                <span className="text-live">Идёт матч · {live.homeScore ?? 0}:{live.awayScore ?? 0}</span>
              ) : (
                <>
                  {formatKickoff(row.match_date)} · {row.is_home ? "Дома" : "В гостях"}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" icon={<Target className="h-4 w-4" strokeWidth={1.75} />} onClick={onExpertClick} className="flex-1">
            Прогноз
          </Button>
          {row.is_home && (
            <Button variant="secondary" size="sm" icon={<Ticket className="h-4 w-4" strokeWidth={1.75} />} onClick={() => setTicketModalOpen(true)} className="flex-1">
              Билет
            </Button>
          )}
        </div>
        {ticketModal}
      </motion.article>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative overflow-hidden rounded-3xl border border-line-strong"
      style={{
        background:
          "linear-gradient(165deg, var(--navy) 0%, #0b1a57 38%, var(--surface) 100%)",
      }}
    >
      {/* Волны герба — единственный декор главной карточки. */}
      <BrandWaves className="absolute inset-x-0 -bottom-2 h-20 w-full" opacity={0.16} />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(0,232,240,0.55), transparent)" }}
        aria-hidden
      />

      <div className="relative p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="t-label truncate text-muted">{row.competition}</p>
          <span className="t-caption shrink-0 rounded-lg bg-white/[0.08] px-2 py-1 text-foreground/80">
            {row.is_home ? "Дома" : "В гостях"}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <TeamColumn name={home.name} logo={home.logo} side={-1} />

          <div className="flex min-w-[120px] flex-col items-center pt-5">
            {live ? (
              <LiveScoreCenter live={live} />
            ) : kickoffSoon ? (
              <MatchScheduleCountdown target={row.match_date} />
            ) : (
              <div className="flex flex-col items-center">
                <span className="t-display text-foreground">{kickoff.getDate()}</span>
                <span className="t-small -mt-0.5 text-muted">{monthShort(kickoff)}</span>
              </div>
            )}
          </div>

          <TeamColumn name={away.name} logo={away.logo} side={1} />
        </div>

        {live && <LiveGoals live={live} />}

        {!live && (
          <p className="t-small mt-5 text-center text-foreground/85">{formatKickoff(row.match_date)}</p>
        )}
        {!live && <ReminderToggle />}

        <div className="mt-5 flex gap-2">
          {row.is_home ? (
            <>
              <Button
                fullWidth
                icon={<Ticket className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                onClick={() => setTicketModalOpen(true)}
              >
                Купить билет
              </Button>
              <Button
                variant="secondary"
                className="shrink-0 bg-white/[0.08] px-4 hover:bg-white/[0.12]"
                onClick={onExpertClick}
                aria-label="Сделать прогноз"
                icon={<Target className="h-[18px] w-[18px]" strokeWidth={1.75} />}
              >
                Прогноз
              </Button>
            </>
          ) : (
            <Button
              fullWidth
              icon={<Target className="h-[18px] w-[18px]" strokeWidth={1.75} />}
              onClick={onExpertClick}
            >
              Сделать прогноз
              <ChevronRight className="-mr-1 h-4 w-4 opacity-60" strokeWidth={2} aria-hidden />
            </Button>
          )}
        </div>
      </div>
      {ticketModal}
    </motion.article>
  );
}

/**
 * «Напомнить за час»: подписка на уведомления бота о матчах. Одна подписка на
 * все матчи — повторно нажимать перед каждой игрой не нужно.
 */
function ReminderToggle() {
  const { enabled, busy, unavailable, error, setEnabled } = useMatchNotifications();
  if (unavailable || enabled === null) return null;
  return (
    <div className="mt-2 flex flex-col items-center">
      <button
        type="button"
        disabled={busy}
        onClick={() => void setEnabled(!enabled)}
        aria-pressed={enabled}
        className={`t-small inline-flex h-9 items-center gap-1.5 rounded-lg px-3 font-medium transition-colors disabled:opacity-50 ${
          enabled ? "text-foreground/70" : "text-accent active:bg-accent/[0.08]"
        }`}
      >
        {enabled ? (
          <>
            <Check className="h-4 w-4 text-win" strokeWidth={2} aria-hidden />
            Напомним за час до матча
          </>
        ) : (
          <>
            <BellRing className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Напомнить за час
          </>
        )}
      </button>
      {error && <p className="t-caption mt-1 text-center text-loss">{error}</p>}
    </div>
  );
}

function TeamColumn({ name, logo, side }: { name: string; logo: string | null; side: -1 | 1 }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <Crest3D src={logo} size={80} from={side} delay={side === -1 ? 0.1 : 0.28} />
      <p className="t-small line-clamp-2 min-h-[36px] font-medium text-foreground">{name}</p>
    </div>
  );
}
