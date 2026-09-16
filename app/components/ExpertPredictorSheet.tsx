"use client";

import { haptic } from "@/lib/telegram/webApp";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle2, ChevronLeft, Loader2, Minus, Plus, X } from "lucide-react";
import Button from "@/app/components/ui/Button";
import Crest from "@/app/components/ui/Crest";
import { PLAYERS } from "@/lib/data/mock";
import type { ScorerCandidate } from "@/lib/kff/scorers";
import { displayCase } from "@/lib/text/displayCase";
import { TEAM_ZHAIYQ } from "@/lib/constants/zhaiyq";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { getTelegramInitData } from "@/lib/telegram/getInitData";
import type { ExpertMatchContext, Team } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
  expertMatch: ExpertMatchContext | null;
};

const STORAGE_EXPERT = "expert_v2";
const TG_USER_STORAGE_KEY = "tg_user_id";

type ExistingPredictionRow = {
  home_score?: number | null;
  away_score?: number | null;
  first_goal_player?: string | null;
  first_goal_minute?: number | null;
  shots_on_target?: number | null;
};

type BootPhase = "idle" | "checking" | "form" | "already";

function getPredictionUserId(): string {
  if (typeof window === "undefined") return "unknown";
  try {
    const savedTgId = localStorage.getItem(TG_USER_STORAGE_KEY);
    if (savedTgId && savedTgId.trim()) return savedTgId.trim();
  } catch {
    /* ignore */
  }
  return "guest";
}

/** Сколько кандидатов показывать сразу; остальные — по кнопке «Ещё». */
const SCORERS_VISIBLE = 6;

let scorersCache: ScorerCandidate[] | null = null;

/** Нападающие, вингеры и атакующие полузащитники Жайыка (роли — по данным KFF). */
async function loadScorerCandidates(): Promise<ScorerCandidate[]> {
  if (scorersCache) return scorersCache;
  const res = await fetch("/api/players/scorers");
  if (!res.ok) throw new Error(String(res.status));
  scorersCache = ((await res.json()) as { players: ScorerCandidate[] }).players;
  return scorersCache;
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

function playerLabelFromId(id: string | null | undefined, roster: ScorerCandidate[] = []): string {
  if (!id) return "—";
  const real = roster.find((x) => x.id === id);
  if (real) return displayCase(real.surname);
  // Старые прогнозы сохраняли id игроков из демо-данных.
  const demo = PLAYERS.find((x) => x.id === id);
  return demo ? `${demo.firstName} ${demo.lastName.charAt(0)}.` : "—";
}

const SCORE_MAX = 20;
const TOTAL_STEPS = 4;

const EASE = [0.2, 0.8, 0.2, 1] as const;

const stepVariants = {
  enter: { opacity: 0, x: 16 },
  center: { opacity: 1, x: 0, transition: { duration: 0.22, ease: EASE } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] as const } },
};

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

/** Короткое имя клуба обычным регистром: «ЖАЙЫК» из константы → «Жайык». */
function teamLabel(team: Team): string {
  return team.id === TEAM_ZHAIYQ.id ? "Жайык" : team.shortName;
}

type RangeProps = {
  min: number;
  max: number;
  value: number;
  onChange: (n: number) => void;
  formatLabel: (n: number) => string;
  "aria-label"?: string;
};

/** Нативный range (тач + доступность): трек surface-2, заполнение и бегунок — accent. */
function RangePicker({ min, max, value, onChange, formatLabel, "aria-label": ariaLabel }: RangeProps) {
  const t = max === min ? 0 : (value - min) / (max - min);
  const thumbLeft = `calc(12px + (100% - 24px) * ${t})`;
  return (
    <div className="w-full">
      <div className="relative flex h-14 items-center justify-center overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={value}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="t-display text-center text-foreground"
          >
            {formatLabel(value)}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="relative mt-6 h-6 w-full">
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-surface-2"
          aria-hidden
        >
          <motion.div
            className="h-full w-full rounded-full bg-accent"
            style={{ transformOrigin: "0% 50%" }}
            initial={false}
            animate={{ scaleX: t }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          />
        </div>
        <motion.div
          className="pointer-events-none absolute top-0 z-10 h-6 w-6 -translate-x-1/2 rounded-full border-4 border-surface bg-accent"
          style={{ left: thumbLeft }}
          initial={false}
          animate={{ left: thumbLeft }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          aria-hidden
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          step={1}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={ariaLabel}
          className="range-neon absolute -top-2 left-0 z-20 h-10 w-full cursor-grab touch-manipulation active:cursor-grabbing"
        />
      </div>
      <div className="t-caption mt-2 flex justify-between text-subtle tabular-nums" aria-hidden>
        <span>{formatLabel(min)}</span>
        <span>{formatLabel(max)}</span>
      </div>
    </div>
  );
}

function StepperButton({
  onClick,
  label,
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-foreground transition-opacity disabled:opacity-40"
    >
      {children}
    </motion.button>
  );
}

function ScoreStepper({
  value,
  onChange,
  teamName,
}: {
  value: number;
  onChange: (n: number) => void;
  teamName: string;
}) {
  const dec = () => {
    if (value > 0) haptic.select();
    onChange(Math.max(0, value - 1));
  };
  const inc = () => {
    if (value < SCORE_MAX) haptic.select();
    onChange(Math.min(SCORE_MAX, value + 1));
  };
  return (
    <div className="flex items-center justify-center gap-2" role="group" aria-label={`Голы ${teamName}`}>
      <StepperButton onClick={dec} label={`Меньше голов: ${teamName}`} disabled={value <= 0}>
        <Minus className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </StepperButton>
      <StepperButton onClick={inc} label={`Больше голов: ${teamName}`} disabled={value >= SCORE_MAX}>
        <Plus className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </StepperButton>
    </div>
  );
}

function ScoreValue({ value }: { value: number }) {
  return (
    <div className="relative h-12 overflow-hidden text-center" aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="t-display block text-foreground"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function teamsFromExpertContext(ctx: ExpertMatchContext): { home: Team; away: Team } {
  const opponent: Team = {
    id: `opponent-${ctx.matchId}`,
    shortName: ctx.opponentName,
    fullName: ctx.opponentName,
    logoUrl: ctx.opponentLogoUrl?.trim() || "",
  };
  return {
    home: ctx.isHome ? TEAM_ZHAIYQ : opponent,
    away: ctx.isHome ? opponent : TEAM_ZHAIYQ,
  };
}

export default function ExpertPredictorSheet({
  open,
  onClose,
  onCompleted,
  expertMatch,
}: Props) {
  useTelegramBackButton(open, onClose);
  const onCompletedRef = useRef(onCompleted);

  const [bootPhase, setBootPhase] = useState<BootPhase>("idle");
  const [existingPrediction, setExistingPrediction] = useState<ExistingPredictionRow | null>(
    null,
  );

  const [step, setStep] = useState(1);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roster, setRoster] = useState<ScorerCandidate[]>(scorersCache ?? []);
  const [showAllScorers, setShowAllScorers] = useState(false);

  useEffect(() => {
    if (!open || roster.length) return;
    let cancelled = false;
    loadScorerCandidates()
      .then((list) => {
        if (!cancelled) setRoster(list);
      })
      .catch(() => {
        /* без списка шаг покажет скелетон; повторим при следующем открытии */
      });
    return () => {
      cancelled = true;
    };
  }, [open, roster.length]);
  const [firstGoalMinute, setFirstGoalMinute] = useState(45);
  const [shots, setShots] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const resetForm = useCallback(() => {
    setStep(1);
    setHomeScore(0);
    setAwayScore(0);
    setPlayerId(null);
    setFirstGoalMinute(45);
    setShots(5);
    setSubmitting(false);
    setShowSuccess(false);
  }, []);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  useEffect(() => {
    if (open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- сброс UI при закрытии */
    setBootPhase("idle");
    setExistingPrediction(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  useEffect(() => {
    if (!open || !expertMatch) return;
    let cancelled = false;

    const run = async () => {
      setBootPhase("checking");
      setExistingPrediction(null);

      const userId = getPredictionUserId();

      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          resetForm();
          setBootPhase("form");
        }
        return;
      }

      const { data, error } = await supabase
        .from("match_predictions")
        .select(
          "home_score, away_score, first_goal_player, first_goal_minute, shots_on_target",
        )
        .eq("match_id", expertMatch.matchId)
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("[ExpertPredictor] existing prediction check failed:", error);
        resetForm();
        setBootPhase("form");
        return;
      }

      if (data) {
        setExistingPrediction(data as ExistingPredictionRow);
        setBootPhase("already");
        try {
          localStorage.setItem(STORAGE_EXPERT, "true");
        } catch {
          /* ignore */
        }
        onCompletedRef.current?.();
        return;
      }

      resetForm();
      setBootPhase("form");
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, expertMatch, resetForm]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const handleSubmit = async () => {
    if (!playerId || !expertMatch) return;
    setSubmitting(true);

    const initData = getTelegramInitData();
    if (!initData) {
      console.error("[ExpertPredictor] Telegram initData not available");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/predictions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData,
          matchId: expertMatch.matchId,
          homeScore,
          awayScore,
          firstGoalPlayer: playerId,
          firstGoalMinute,
          shotsOnTarget: shots,
        }),
      });

      if (!res.ok) {
        console.error("[ExpertPredictor] submit failed:", res.status, await res.text());
        setSubmitting(false);
        return;
      }

      try {
        localStorage.setItem(STORAGE_EXPERT, "true");
      } catch {
        /* ignore */
      }
      setSubmitting(false);
      setShowSuccess(true);
      haptic.notify("success");
      onCompleted();
      window.setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1100);
    } catch (error: unknown) {
      console.error("[ExpertPredictor] submit threw:", error);
      setSubmitting(false);
    }
  };

  /** Первый кадр после открытия ещё с `bootPhase === "idle"` — не мелькаем формой. */
  const showChecking =
    open && expertMatch && (bootPhase === "idle" || bootPhase === "checking");

  const { home: matchHome, away: matchAway } = expertMatch
    ? teamsFromExpertContext(expertMatch)
    : { home: TEAM_ZHAIYQ, away: TEAM_ZHAIYQ };

  const showForm = !showSuccess && !showChecking && !(bootPhase === "already" && existingPrediction);
  const canGoBack = showForm && step > 1 && !submitting;

  const goNext = () => {
    if (step === 2 && !playerId) return;
    setStep(step + 1);
  };

  return (
    <AnimatePresence>
      {open && expertMatch && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal
          aria-labelledby="expert-predictor-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-background/80"
            aria-label="Закрыть"
            onClick={onClose}
          />

          <motion.div
            className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl border-t border-line bg-surface pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-2"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto h-1 w-9 shrink-0 rounded-full bg-line-strong" aria-hidden />

            {/* Шапка: назад · заголовок · закрыть */}
            <div className="grid h-14 shrink-0 grid-cols-[40px_1fr_40px] items-center px-2">
              {canGoBack ? (
                <button
                  type="button"
                  aria-label="Назад"
                  onClick={() => {
                    haptic.select();
                    setStep(step - 1);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground transition-colors active:bg-surface-2"
                >
                  <ChevronLeft className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                </button>
              ) : (
                <span />
              )}
              <h2 id="expert-predictor-title" className="t-h3 text-center text-foreground">
                Угадай счёт
              </h2>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={onClose}
                disabled={submitting || showSuccess}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors active:bg-surface-2 disabled:opacity-40"
              >
                <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {showSuccess ? (
                <motion.div
                  key="success"
                  {...fade}
                  className="flex flex-col items-center px-6 pb-8 pt-4 text-center"
                >
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 24, delay: 0.05 }}
                  >
                    <CheckCircle2 className="h-14 w-14 text-win" strokeWidth={1.75} aria-hidden />
                  </motion.span>
                  <p className="t-h2 mt-4 text-foreground">Прогноз принят</p>
                  <p className="t-small mt-1.5 text-muted tabular-nums">
                    {teamLabel(matchHome)} {homeScore}:{awayScore} {teamLabel(matchAway)} · первый
                    гол — {playerLabelFromId(playerId, roster)}, {firstGoalMinute}′
                  </p>
                </motion.div>
              ) : showChecking ? (
                <motion.div
                  key="checking"
                  {...fade}
                  className="flex flex-col items-center gap-3 px-6 py-12"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-muted" strokeWidth={1.75} aria-hidden />
                  <p className="t-small text-muted">Проверяем прогноз…</p>
                </motion.div>
              ) : bootPhase === "already" && existingPrediction ? (
                <motion.div key="already" {...fade} className="flex flex-col px-4 pt-2">
                  <p className="t-h2 text-foreground">Прогноз уже сделан</p>
                  <p className="t-small mt-1 text-muted">
                    Он сохранён — изменить или отправить заново нельзя.
                  </p>

                  <div className="mt-5 flex items-center justify-center gap-4 rounded-xl bg-surface-2 px-4 py-4">
                    <div className="flex w-20 flex-col items-center gap-1.5">
                      <Crest src={matchHome.logoUrl} size={40} />
                      <span className="t-caption line-clamp-1 text-center text-muted">
                        {teamLabel(matchHome)}
                      </span>
                    </div>
                    <p className="t-h1 tabular-nums text-foreground">
                      {existingPrediction.home_score ?? 0}
                      <span className="mx-2 text-subtle">:</span>
                      {existingPrediction.away_score ?? 0}
                    </p>
                    <div className="flex w-20 flex-col items-center gap-1.5">
                      <Crest src={matchAway.logoUrl} size={40} />
                      <span className="t-caption line-clamp-1 text-center text-muted">
                        {teamLabel(matchAway)}
                      </span>
                    </div>
                  </div>

                  <dl className="mt-2 divide-y divide-line">
                    <div className="flex min-h-12 items-center justify-between gap-3">
                      <dt className="t-small text-muted">Первый гол</dt>
                      <dd className="t-body font-medium text-foreground">
                        {playerLabelFromId(existingPrediction.first_goal_player ?? undefined, roster)}
                      </dd>
                    </div>
                    <div className="flex min-h-12 items-center justify-between gap-3">
                      <dt className="t-small text-muted">Минута первого гола</dt>
                      <dd className="t-body font-medium tabular-nums text-foreground">
                        {existingPrediction.first_goal_minute != null
                          ? `${existingPrediction.first_goal_minute}′`
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex min-h-12 items-center justify-between gap-3">
                      <dt className="t-small text-muted">Удары в створ</dt>
                      <dd className="t-body font-medium tabular-nums text-foreground">
                        {existingPrediction.shots_on_target ?? "—"}
                      </dd>
                    </div>
                  </dl>

                  <Button fullWidth onClick={onClose} className="mt-4">
                    Понятно
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="form" {...fade} className="flex min-h-0 flex-col">
                  {/* Прогресс шагов */}
                  <div
                    className="flex shrink-0 gap-1 px-4"
                    role="progressbar"
                    aria-valuemin={1}
                    aria-valuemax={TOTAL_STEPS}
                    aria-valuenow={step}
                    aria-label={`Шаг ${step} из ${TOTAL_STEPS}`}
                  >
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                      <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <motion.span
                          className="block h-full w-full rounded-full bg-accent"
                          style={{ transformOrigin: "0% 50%" }}
                          initial={false}
                          animate={{ scaleX: i < step ? 1 : 0 }}
                          transition={{ duration: 0.22, ease: EASE }}
                        />
                      </span>
                    ))}
                  </div>

                  <div className="no-scrollbar min-h-0 overflow-y-auto px-4 pt-6">
                    <AnimatePresence mode="wait" initial={false}>
                      {step === 1 && (
                        <motion.div
                          key="s1"
                          variants={stepVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          className="flex flex-col"
                        >
                          <p className="t-body text-center text-muted">Какой будет счёт?</p>

                          <div className="mt-5 grid grid-cols-[1fr_32px_1fr] items-center gap-y-3">
                            {[matchHome, null, matchAway].map((team, i) =>
                              team ? (
                                <div key={`h-${i}`} className="flex flex-col items-center gap-2">
                                  <Crest src={team.logoUrl} alt={team.fullName} size={56} />
                                  <span className="t-small line-clamp-2 flex h-9 w-[120px] items-start justify-center text-center text-muted">
                                    {teamLabel(team)}
                                  </span>
                                </div>
                              ) : (
                                <span key="h-gap" />
                              ),
                            )}

                            <ScoreValue value={homeScore} />
                            <span className="t-h1 select-none text-center text-subtle" aria-hidden>
                              :
                            </span>
                            <ScoreValue value={awayScore} />

                            <ScoreStepper
                              value={homeScore}
                              onChange={setHomeScore}
                              teamName={teamLabel(matchHome)}
                            />
                            <span />
                            <ScoreStepper
                              value={awayScore}
                              onChange={setAwayScore}
                              teamName={teamLabel(matchAway)}
                            />
                          </div>

                          <p className="t-small mt-6 text-center text-muted">
                            Угадай счёт — получи монеты
                          </p>
                        </motion.div>
                      )}

                      {step === 2 && (
                        <motion.div
                          key="s2"
                          variants={stepVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          className="flex flex-col"
                        >
                          <p className="t-body text-center text-muted">Кто забьёт первым за Жайык?</p>
                          {roster.length === 0 ? (
                            <div className="mt-5 grid grid-cols-2 gap-3" aria-busy>
                              {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="aspect-[5/4] animate-pulse rounded-2xl bg-surface-2" />
                              ))}
                            </div>
                          ) : (
                            <>
                              <div
                                className="mt-4 grid max-h-[54dvh] grid-cols-2 gap-2.5 overflow-y-auto overscroll-contain pb-1"
                                role="radiogroup"
                                aria-label="Кто забьёт первым"
                              >
                                {(showAllScorers ? roster : roster.slice(0, SCORERS_VISIBLE)).map((p) => {
                                  const sel = playerId === p.id;
                                  return (
                                    <motion.button
                                      key={p.id}
                                      type="button"
                                      role="radio"
                                      aria-checked={sel}
                                      onClick={() => {
                                        if (!sel) haptic.select();
                                        setPlayerId(p.id);
                                      }}
                                      whileTap={{ scale: 0.97 }}
                                      transition={{ duration: 0.12, ease: "easeOut" }}
                                      className={`relative flex flex-col overflow-hidden rounded-2xl bg-surface-2 text-left ring-inset transition-shadow duration-150 ${
                                        sel ? "ring-2 ring-accent" : "ring-1 ring-line"
                                      }`}
                                    >
                                      <div className="relative aspect-[5/4] w-full overflow-hidden bg-gradient-to-b from-navy/70 via-navy/30 to-surface-2">
                                        {p.photoUrl ? (
                                          // eslint-disable-next-line @next/next/no-img-element -- вырезки игроков с kffleague.kz
                                          <img
                                            src={p.photoUrl}
                                            alt=""
                                            loading="lazy"
                                            className="absolute inset-x-0 bottom-0 mx-auto h-[96%] w-auto max-w-none object-contain object-bottom"
                                          />
                                        ) : (
                                          <span className="absolute inset-0 flex items-center justify-center text-[28px] font-semibold text-accent/60">
                                            {`${p.surname.charAt(0)}${p.firstName.charAt(0)}`.toUpperCase()}
                                          </span>
                                        )}
                                        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-surface-2 to-transparent" aria-hidden />
                                        {p.number !== "—" && (
                                          <span className="t-small absolute left-2.5 top-2 font-semibold tabular-nums text-foreground/90">{p.number}</span>
                                        )}
                                        {sel && (
                                          <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-on-accent">
                                            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                                          </span>
                                        )}
                                        {p.goals > 0 && (
                                          <span className="t-caption absolute bottom-2 right-2.5 rounded-md bg-background/70 px-1.5 py-0.5 tabular-nums text-foreground">
                                            {p.goals} {plural(p.goals, "гол", "гола", "голов")}
                                          </span>
                                        )}
                                      </div>
                                      <span className="px-3 pb-2.5 pt-1">
                                        <span className="t-body block truncate font-medium text-foreground">{p.surname}</span>
                                        <span className="t-caption block truncate text-muted">
                                          {p.role === "Атакующий полузащитник" ? "Полузащитник" : p.role}
                                        </span>
                                      </span>
                                    </motion.button>
                                  );
                                })}
                              </div>
                              {!showAllScorers && roster.length > SCORERS_VISIBLE && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    haptic.select();
                                    setShowAllScorers(true);
                                  }}
                                  className="t-small mx-auto mt-3 h-9 rounded-lg px-3 font-medium text-accent active:bg-accent/[0.08]"
                                >
                                  Ещё {roster.length - SCORERS_VISIBLE} {plural(roster.length - SCORERS_VISIBLE, "игрок", "игрока", "игроков")}
                                </button>
                              )}
                            </>
                          )}
                        </motion.div>
                      )}

                      {step === 3 && (
                        <motion.div
                          key="s3"
                          variants={stepVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          className="flex flex-col"
                        >
                          <p className="t-body text-center text-muted">На какой минуте будет первый гол?</p>
                          <div className="mt-6 px-1">
                            <RangePicker
                              min={1}
                              max={90}
                              value={firstGoalMinute}
                              onChange={setFirstGoalMinute}
                              formatLabel={(n) => `${n}′`}
                              aria-label="Минута первого гола, от 1 до 90"
                            />
                          </div>
                        </motion.div>
                      )}

                      {step === 4 && (
                        <motion.div
                          key="s4"
                          variants={stepVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          className="flex flex-col"
                        >
                          <p className="t-body text-center text-muted">
                            Сколько ударов в створ нанесёт Жайык?
                          </p>
                          <div className="mt-6 px-1">
                            <RangePicker
                              min={0}
                              max={20}
                              value={shots}
                              onChange={setShots}
                              formatLabel={(n) => String(n)}
                              aria-label="Удары в створ, от 0 до 20"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="shrink-0 px-4 pt-6">
                    {step < TOTAL_STEPS ? (
                      <Button fullWidth onClick={goNext} disabled={step === 2 && !playerId}>
                        Далее
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        loading={submitting}
                        disabled={!playerId}
                        onClick={handleSubmit}
                      >
                        Отправить прогноз
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
