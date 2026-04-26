"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import TeamBadge from "@/app/components/TeamBadge";
import { PLAYERS } from "@/lib/data/mock";
import { TEAM_ZHAIYQ } from "@/lib/constants/zhaiyq";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
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

function playerLabelFromId(id: string | null | undefined): string {
  if (!id) return "—";
  const p = PLAYERS.find((x) => x.id === id);
  if (!p) return "—";
  return `${p.firstName} ${p.lastName.charAt(0)}.`;
}

const EXPERT_PLAYERS = PLAYERS.filter((p) => p.squad === "main").slice(0, 4);

const SCORE_MAX = 20;

const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const panel = {
  hidden: { y: 24, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 380, damping: 32 },
  },
  exit: { y: 16, opacity: 0, transition: { duration: 0.2 } },
};

const stepVariants = {
  enter: { opacity: 0, x: 32 },
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    x: -28,
    transition: { duration: 0.26, ease: [0.4, 0, 1, 1] as const },
  },
};

const selectedPlayerCard =
  "z-10 border-2 border-accent shadow-[0_0_20px_#00F0FF] ring-1 ring-accent/30";
const unselectedPlayerCard = "border-2 border-white/10 hover:border-white/22";

type NeonRangeProps = {
  min: number;
  max: number;
  value: number;
  onChange: (n: number) => void;
  formatLabel: (n: number) => string;
  "aria-label"?: string;
};

/** Native range (touch + a11y) with neon fill and motion thumb. */
function NeonRange({
  min,
  max,
  value,
  onChange,
  formatLabel,
  "aria-label": ariaLabel,
}: NeonRangeProps) {
  const t = max === min ? 0 : (value - min) / (max - min);
  const thumbLeft = `calc(10px + (100% - 20px) * ${t})`;
  return (
    <div className="w-full">
      <div className="relative flex min-h-[5.5rem] items-center justify-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={value}
            initial={{ opacity: 0, scale: 0.88, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className="text-center text-6xl font-black tabular-nums tracking-tight text-white"
          >
            {formatLabel(value)}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="relative w-full min-h-12">
        <div
          className="pointer-events-none h-2 w-full overflow-hidden rounded-full bg-white/10"
          aria-hidden
        >
          <motion.div
            className="h-full w-full origin-left rounded-full bg-accent shadow-[0_0_15px_#00F0FF]"
            style={{ transformOrigin: "0% 50%" }}
            initial={false}
            animate={{ scaleX: t }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        </div>
        <motion.div
          className="pointer-events-none absolute -top-1.5 z-10 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white/90 bg-accent shadow-[0_0_15px_#00F0FF]"
          style={{ left: thumbLeft }}
          initial={false}
          animate={{ left: thumbLeft }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          step={1}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={ariaLabel}
          className="range-neon absolute -top-3 left-0 z-20 h-10 w-full cursor-grab touch-manipulation active:cursor-grabbing"
        />
      </div>
    </div>
  );
}

function ScoreAdjuster({
  value,
  onChange,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  ariaLabel: string;
}) {
  const dec = () => onChange(Math.max(0, value - 1));
  const inc = () => onChange(Math.min(SCORE_MAX, value + 1));
  return (
    <div className="flex items-center gap-1.5 sm:gap-2" role="group" aria-label={ariaLabel}>
      <motion.button
        type="button"
        onClick={dec}
        whileTap={{ scale: 0.9 }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-lg font-black text-foreground/90 shadow-inner transition-colors hover:border-accent/40 hover:bg-white/[0.1] active:bg-white/[0.14]"
      >
        −
      </motion.button>
      <div className="relative min-w-[3.25rem] overflow-hidden text-center sm:min-w-[4rem]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(3px)" }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="block text-4xl font-black tabular-nums tracking-tighter text-white drop-shadow-[0_0_24px_rgba(0,240,255,0.15)] sm:text-5xl"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <motion.button
        type="button"
        onClick={inc}
        whileTap={{ scale: 0.9 }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-lg font-black text-foreground/90 shadow-inner transition-colors hover:border-accent/40 hover:bg-white/[0.1] active:bg-white/[0.14]"
      >
        +
      </motion.button>
    </div>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className ?? ""}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
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
  const onCompletedRef = useRef(onCompleted);

  const [bootPhase, setBootPhase] = useState<BootPhase>("idle");
  const [existingPrediction, setExistingPrediction] = useState<ExistingPredictionRow | null>(
    null,
  );

  const [step, setStep] = useState(1);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [playerId, setPlayerId] = useState<string | null>(null);
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
    const savedTgId =
      typeof window !== "undefined"
        ? (() => {
            try {
              return localStorage.getItem(TG_USER_STORAGE_KEY);
            } catch {
              return null;
            }
          })()
        : null;
    const userId =
      savedTgId && savedTgId.trim() ? savedTgId.trim() : "guest";
    const row = {
      match_id: expertMatch.matchId,
      home_score: homeScore,
      away_score: awayScore,
      first_goal_player: playerId,
      first_goal_minute: firstGoalMinute,
      shots_on_target: shots,
      user_id: userId,
    };

    if (!isSupabaseConfigured()) {
      console.error("[ExpertPredictor] Supabase env not configured");
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from("match_predictions").insert(row);

      if (error) {
        console.error("[ExpertPredictor] Supabase insert failed:", error);
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
      onCompleted();
      window.setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1100);
    } catch (error: unknown) {
      console.error("[ExpertPredictor] Supabase insert threw:", error);
      setSubmitting(false);
    }
  };

  const progress = (step / 4) * 100;

  /** Первый кадр после открытия ещё с `bootPhase === "idle"` — не мелькаем формой. */
  const showChecking =
    open && expertMatch && (bootPhase === "idle" || bootPhase === "checking");

  const { home: matchHome, away: matchAway } = expertMatch
    ? teamsFromExpertContext(expertMatch)
    : { home: TEAM_ZHAIYQ, away: TEAM_ZHAIYQ };

  return (
    <AnimatePresence>
      {open && expertMatch && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal
          aria-labelledby="expert-predictor-title"
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-[#010306]/92 backdrop-blur-md"
            aria-label="Закрыть"
            onClick={onClose}
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
          />

          <motion.div
            className="glass-premium relative z-10 flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/[0.08] sm:rounded-2xl"
            style={{
              background:
                "linear-gradient(168deg, rgba(1,3,8,0.97) 0%, rgba(3,8,16,0.96) 45%, rgba(1,2,6,0.99) 100%)",
            }}
            variants={panel}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Закрыть"
              onClick={onClose}
              disabled={submitting || showSuccess}
              className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-foreground backdrop-blur-md transition-colors hover:bg-black/60 disabled:pointer-events-none disabled:opacity-40"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>

            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className="flex flex-1 flex-col items-center justify-center gap-4 px-6"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -40 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.05 }}
                    className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-accent bg-accent/15 neon-cyan-surface shadow-[0_0_40px_rgba(0,240,255,0.35)]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-12 w-12 text-accent"
                      aria-hidden
                    >
                      <motion.path
                        d="M6 12l4 4 8-8"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
                      />
                    </svg>
                  </motion.div>
                  <p className="text-center text-lg font-black uppercase tracking-wide text-foreground">
                    Прогноз принят!
                  </p>
                </motion.div>
              ) : showChecking ? (
                <motion.div
                  key="checking"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-1 flex-col items-center justify-center gap-5 px-8"
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-accent/40 bg-accent/10 shadow-[0_0_36px_rgba(0,240,255,0.25)]">
                    <Spinner className="h-10 w-10 text-accent" />
                  </div>
                  <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-white/55">
                    Проверяем прогноз…
                  </p>
                </motion.div>
              ) : bootPhase === "already" && existingPrediction ? (
                <motion.div
                  key="already"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="flex min-h-0 flex-1 flex-col px-5 pb-8 pt-14"
                >
                  <div className="mb-6 flex flex-col items-center gap-3 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/35 bg-accent/10 shadow-[0_0_28px_rgba(0,240,255,0.2)]">
                      <TargetIcon className="h-8 w-8 text-accent neon-cyan" />
                    </div>
                    <h2 className="text-base font-black uppercase tracking-tight text-foreground">
                      Вы уже сделали прогноз
                    </h2>
                    <p className="max-w-xs text-[11px] font-medium leading-relaxed text-white/45">
                      Он сохранён на сервере — изменить или отправить заново нельзя.
                    </p>
                  </div>

                  <div className="mx-auto w-full max-w-sm space-y-3 rounded-2xl border border-white/[0.09] bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                        Счёт
                      </span>
                      <p className="text-2xl font-black tabular-nums tracking-tight text-white">
                        <span className="text-accent drop-shadow-[0_0_12px_rgba(0,240,255,0.35)]">
                          {existingPrediction.home_score ?? 0}
                        </span>
                        <span className="mx-1.5 text-white/35">:</span>
                        <span className="text-accent drop-shadow-[0_0_12px_rgba(0,240,255,0.35)]">
                          {existingPrediction.away_score ?? 0}
                        </span>
                      </p>
                    </div>
                    <dl className="space-y-2.5 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-white/40">
                          Первый гол
                        </dt>
                        <dd className="text-right font-bold text-foreground/95">
                          {playerLabelFromId(existingPrediction.first_goal_player ?? undefined)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-white/40">
                          Минута
                        </dt>
                        <dd className="text-right font-black tabular-nums text-white">
                          {existingPrediction.first_goal_minute != null
                            ? `${existingPrediction.first_goal_minute}′`
                            : "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-white/40">
                          Удары в створ
                        </dt>
                        <dd className="text-right font-black tabular-nums text-white">
                          {existingPrediction.shots_on_target ?? "—"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="mt-auto flex justify-center pt-8">
                    <motion.button
                      type="button"
                      onClick={onClose}
                      whileTap={{ scale: 0.98 }}
                      className="neon-cyan-surface rounded-2xl bg-accent px-10 py-3.5 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_24px_rgba(0,240,255,0.35)]"
                    >
                      Понятно
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 pt-12">
                    <div className="mb-4 flex items-center justify-center gap-2">
                      <TargetIcon className="h-6 w-6 text-accent neon-cyan" />
                      <h1
                        id="expert-predictor-title"
                        className="text-center text-lg font-black uppercase tracking-tight text-foreground"
                      >
                        ZHAIYQ ЭКСПЕРТ
                      </h1>
                    </div>

                    <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-accent shadow-[0_0_16px_rgba(0,240,255,0.5)]"
                        initial={false}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>

                    <AnimatePresence mode="wait">
                      {step === 1 && (
                        <motion.div
                          key="s1"
                          variants={stepVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          className="flex min-h-0 flex-1 flex-col gap-5"
                        >
                          <p className="text-center text-sm font-bold text-foreground/95">
                            Твой счёт матча
                          </p>

                          <div className="flex w-full items-center justify-between px-4">
                            <motion.div
                              className="flex flex-col items-center gap-2"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.05, duration: 0.35 }}
                            >
                              <TeamBadge team={matchHome} size="md" />
                              <span className="text-center text-sm font-black text-white">
                                {matchHome.shortName}
                              </span>
                              <ScoreAdjuster
                                value={homeScore}
                                onChange={setHomeScore}
                                ariaLabel={`Голы ${matchHome.shortName}`}
                              />
                            </motion.div>

                            <span
                              className="shrink-0 select-none text-4xl font-black text-white/50"
                              aria-hidden
                            >
                              :
                            </span>

                            <motion.div
                              className="flex flex-col items-center gap-2"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1, duration: 0.35 }}
                            >
                              <TeamBadge team={matchAway} size="md" />
                              <span className="text-center text-sm font-black text-white">
                                {matchAway.shortName}
                              </span>
                              <ScoreAdjuster
                                value={awayScore}
                                onChange={setAwayScore}
                                ariaLabel={`Голы ${matchAway.shortName}`}
                              />
                            </motion.div>
                          </div>

                          <p className="mx-auto max-w-[300px] bg-gradient-to-r from-white/40 to-rose-400/80 bg-clip-text text-center text-[10px] font-medium leading-relaxed text-transparent">
                            Букмекерка — это зло, а наш прогноз — это по-пацански
                          </p>

                          <div className="mt-auto flex justify-end gap-3 pt-2">
                            <span />
                            <motion.button
                              type="button"
                              onClick={() => setStep(2)}
                              whileTap={{ scale: 0.98 }}
                              className="neon-cyan-surface rounded-2xl bg-accent px-8 py-3.5 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_24px_rgba(0,240,255,0.35)]"
                            >
                              Далее
                            </motion.button>
                          </div>
                        </motion.div>
                      )}

                      {step === 2 && (
                        <motion.div
                          key="s2"
                          variants={stepVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          className="flex min-h-0 flex-1 flex-col"
                        >
                          <p className="mb-3 text-center text-sm font-bold text-foreground/95">
                            Кто забьёт первым за Жайык?
                          </p>
                          <div className="hide-scrollbar -mx-1 flex gap-4 overflow-x-auto overflow-y-visible pb-4 pl-1 pr-4 snap-x snap-mandatory sm:pl-2">
                            {EXPERT_PLAYERS.map((p, i) => {
                              const sel = playerId === p.id;
                              const label = `${p.firstName} ${p.lastName.charAt(0)}.`;
                              return (
                                <motion.button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setPlayerId(p.id)}
                                  initial={{ opacity: 0, x: 24 }}
                                  animate={{
                                    opacity: 1,
                                    x: 0,
                                    scale: sel ? 1.05 : 1,
                                  }}
                                  transition={{
                                    opacity: { delay: i * 0.06, duration: 0.32, ease: [0.22, 1, 0.36, 1] },
                                    x: { delay: i * 0.06, duration: 0.32, ease: [0.22, 1, 0.36, 1] },
                                    scale: { type: "spring", stiffness: 400, damping: 28 },
                                  }}
                                  className={`relative flex min-w-[180px] shrink-0 snap-center flex-col overflow-hidden rounded-2xl bg-white/[0.03] aspect-[16/9] ${sel ? selectedPlayerCard : unselectedPlayerCard}`}
                                  whileTap={{ scale: sel ? 1.02 : 0.98 }}
                                >
                                  <div className="relative min-h-0 flex-1 overflow-hidden bg-gradient-to-b from-white/[0.04] to-transparent">
                                    <Image
                                      src={p.photoUrl}
                                      alt=""
                                      fill
                                      sizes="180px"
                                      className="object-contain object-bottom"
                                    />
                                  </div>
                                  <div className="border-t border-white/10 bg-black/55 px-2 py-2 backdrop-blur-md">
                                    <span className="line-clamp-1 text-center text-[13px] font-bold leading-tight text-foreground">
                                      {label}
                                    </span>
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                          <div className="mt-auto flex justify-between gap-3 pt-2">
                            <motion.button
                              type="button"
                              onClick={() => setStep(1)}
                              whileTap={{ scale: 0.98 }}
                              className="rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-xs font-black uppercase tracking-widest text-foreground transition-colors hover:bg-white/[0.08]"
                            >
                              Назад
                            </motion.button>
                            <motion.button
                              type="button"
                              disabled={!playerId}
                              onClick={() => setStep(3)}
                              whileTap={{ scale: 0.98 }}
                              className="neon-cyan-surface rounded-2xl bg-accent px-8 py-3.5 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_24px_rgba(0,240,255,0.35)] transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              Далее
                            </motion.button>
                          </div>
                        </motion.div>
                      )}

                      {step === 3 && (
                        <motion.div
                          key="s3"
                          variants={stepVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          className="flex flex-1 flex-col"
                        >
                          <p className="mb-2 text-center text-sm font-bold text-foreground/95">
                            На какой минуте будет первый гол?
                          </p>
                          <div className="flex flex-1 flex-col justify-center px-0 py-4">
                            <NeonRange
                              min={1}
                              max={90}
                              value={firstGoalMinute}
                              onChange={setFirstGoalMinute}
                              formatLabel={(n) => `${n}′`}
                              aria-label="Минута первого гола, от 1 до 90"
                            />
                          </div>
                          <div className="mt-auto flex justify-between gap-3 pt-4">
                            <motion.button
                              type="button"
                              onClick={() => setStep(2)}
                              whileTap={{ scale: 0.98 }}
                              className="rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-xs font-black uppercase tracking-widest text-foreground transition-colors hover:bg-white/[0.08]"
                            >
                              Назад
                            </motion.button>
                            <motion.button
                              type="button"
                              onClick={() => setStep(4)}
                              whileTap={{ scale: 0.98 }}
                              className="neon-cyan-surface rounded-2xl bg-accent px-8 py-3.5 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_24px_rgba(0,240,255,0.3)]"
                            >
                              Далее
                            </motion.button>
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
                          className="flex flex-1 flex-col"
                        >
                          <p className="mb-2 text-center text-sm font-bold text-foreground/95">
                            Сколько ударов в створ нанесёт Жайык?
                          </p>
                          <div className="flex flex-1 flex-col justify-center px-0 py-4">
                            <NeonRange
                              min={0}
                              max={20}
                              value={shots}
                              onChange={setShots}
                              formatLabel={(n) => String(n)}
                              aria-label="Удары в створ, от 0 до 20"
                            />
                          </div>
                          <div className="mt-auto flex flex-col gap-3 pt-6">
                            <motion.button
                              type="button"
                              onClick={() => setStep(3)}
                              disabled={submitting}
                              whileTap={{ scale: 0.98 }}
                              className="self-start rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3 text-xs font-black uppercase tracking-widest text-foreground transition-colors hover:bg-white/[0.08] disabled:opacity-40"
                            >
                              Назад
                            </motion.button>
                            <motion.button
                              type="button"
                              disabled={submitting || !playerId}
                              onClick={handleSubmit}
                              whileTap={{ scale: 0.99 }}
                              className="neon-cyan-surface flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-xs font-black uppercase tracking-[0.12em] text-black shadow-[0_0_28px_rgba(0,240,255,0.4)] transition-[transform,filter] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {submitting ? (
                                <>
                                  <Spinner className="h-5 w-5 text-black" />
                                  <span>Отправка…</span>
                                </>
                              ) : (
                                "ОТПРАВИТЬ ПРОГНОЗ"
                              )}
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
