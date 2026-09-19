"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Star, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { PenaltySceneHandle } from "@/app/components/game/PenaltyScene";
import PowerMeter, { powerAt } from "@/app/components/game/PowerMeter";
import { swipeToAim, type SwipePoint } from "@/app/components/game/shotGesture";
import Button from "@/app/components/ui/Button";
import { PENALTY_SPOT, POWER_SWEET_MAX, POWER_SWEET_MIN, type ShotInput, type ShotKind } from "@/lib/game/penalty";
import { playCrowdReaction, startCrowdAmbient, stopCrowdAmbient, unlockAudio } from "@/lib/game/sfx";
import {
  simulateTrainingShot,
  STAR_THRESHOLDS,
  starsFor,
  targetFromSeed,
  TRAINING_SHOTS,
  type Target,
  type TrainingShotOutcome,
  type Zone,
} from "@/lib/game/training";
import { haptic } from "@/lib/telegram/webApp";

const PenaltyScene = dynamic(() => import("@/app/components/game/PenaltyScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-background" />,
});

/** power — ловим силу, aim — рисуем удар, shooting — полёт, result — итог удара, summary — итог тренировки. */
type Phase = "power" | "aim" | "shooting" | "result" | "summary";

/** Локальный прототип: прогресса нет, поэтому точность всегда 1-го уровня — физика как в матче. */
const ACCURACY_LEVEL = 1;

/** Раньше этого шкалу поймать нельзя: чтобы случайное касание при старте не било «в ноль». */
const MIN_CHARGE_MS = 120;

const ZONE_COPY: Record<Zone, { title: string; tone: string; dot: string }> = {
  center: { title: "В ЦЕНТР!", tone: "text-accent", dot: "bg-accent" },
  middle: { title: "ХОРОШО", tone: "text-foreground", dot: "bg-foreground" },
  outer: { title: "РЯДОМ", tone: "text-draw", dot: "bg-draw" },
  miss: { title: "МИМО", tone: "text-muted", dot: "bg-loss/80" },
};

const KIND_LABEL: Record<ShotKind, string> = { straight: "Прямой", curl: "Крученый", lob: "Парашют", knuckle: "Наклбол" };

function makeTargets(): Target[] {
  return Array.from({ length: TRAINING_SHOTS }, () => targetFromSeed(Math.floor(Math.random() * 2 ** 32)));
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

/**
 * Тренировка точности: 5 ударов с пенальти по мишени в воротах. Всё считается
 * локально по тем же формулам, что и матч (simulateTrainingShot), — без сервера,
 * очков рейтинга, монет и опыта. Вратарь стоит и не отбивает.
 */
export default function AccuracyDrill({ onExit }: { onExit: () => void }) {
  const scene = useRef<PenaltySceneHandle>(null);
  const [targets, setTargets] = useState<Target[]>(makeTargets);
  /** Номер текущего удара, 0..4. */
  const [current, setCurrent] = useState(0);
  const [shots, setShots] = useState<TrainingShotOutcome[]>([]);
  const [phase, setPhase] = useState<Phase>("power");
  const [gaugeSince, setGaugeSince] = useState<number | null>(() => performance.now());
  const [power, setPower] = useState<number | null>(null);
  const [liveKind, setLiveKind] = useState<ShotKind | null>(null);
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const swipe = useRef<SwipePoint[]>([]);

  useEffect(() => {
    startCrowdAmbient();
    return () => stopCrowdAmbient();
  }, []);

  const score = shots.reduce((sum, s) => sum + s.points, 0);
  const last = shots[shots.length - 1] ?? null;
  const stars = starsFor(score);

  const shoot = (input: ShotInput) => {
    setPhase("shooting");
    haptic.impact("medium");
    scene.current?.windUp();
    const outcome = simulateTrainingShot(input, Math.random, ACCURACY_LEVEL, targets[current]);
    scene.current?.play(outcome, () => {
      setShots((s) => [...s, outcome]);
      setPhase("result");
      playCrowdReaction(outcome.zone === "miss" ? "miss" : "goal");
      if (outcome.zone === "center") haptic.notify("success");
      else if (outcome.zone === "miss") haptic.notify("error");
      else haptic.notify("warning");
    });
  };

  const catchPower = () => {
    if (gaugeSince == null) return;
    const now = performance.now();
    if (now - gaugeSince < MIN_CHARGE_MS) return;
    const g = powerAt(gaugeSince, now);
    setGaugeSince(null);
    setPower(g);
    haptic.notify(g < POWER_SWEET_MIN || g > POWER_SWEET_MAX ? "warning" : "success");
    setPhase("aim");
  };

  const onPointerDown = (e: React.PointerEvent) => {
    unlockAudio();
    if (phase === "power") return catchPower();
    if (phase !== "aim") return;
    // Прицел ведём от мяча: начинать свайп можно в нижней части экрана.
    if (e.clientY < window.innerHeight * 0.45) return;
    swipe.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    setTrail([{ x: e.clientX, y: e.clientY }]);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (phase !== "aim" || !swipe.current.length || power == null) return;
    swipe.current.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    setTrail((tr) => [...tr.slice(-24), { x: e.clientX, y: e.clientY }]);
    const handle = scene.current;
    if (!handle) return;
    const input = swipeToAim(swipe.current, power, "penalty", handle.goalPointAt);
    handle.setAimPreview(input);
    const k = input?.kind ?? null;
    if (k !== liveKind) {
      if (k) haptic.select();
      setLiveKind(k);
    }
  };
  const onPointerUp = () => {
    if (phase !== "aim" || !swipe.current.length || power == null) return;
    const handle = scene.current;
    const input = handle ? swipeToAim(swipe.current, power, "penalty", handle.goalPointAt) : null;
    swipe.current = [];
    handle?.setAimPreview(null);
    setLiveKind(null);
    window.setTimeout(() => setTrail([]), 180);
    if (input) shoot(input);
  };
  const onPointerCancel = () => {
    swipe.current = [];
    scene.current?.setAimPreview(null);
    setLiveKind(null);
    setTrail([]);
  };

  const next = () => {
    scene.current?.reset();
    setPower(null);
    if (current + 1 >= TRAINING_SHOTS) {
      setPhase("summary");
      return;
    }
    setCurrent((c) => c + 1);
    setGaugeSince(performance.now());
    setPhase("power");
  };

  const restart = () => {
    scene.current?.reset();
    setTargets(makeTargets());
    setShots([]);
    setCurrent(0);
    setPower(null);
    setGaugeSince(performance.now());
    setPhase("power");
  };

  const nextStar = STAR_THRESHOLDS.find((t) => score < t);

  return (
    <div
      className="fixed inset-0 z-[60] touch-none select-none overflow-hidden bg-background [-webkit-touch-callout:none]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="absolute inset-0">
        <PenaltyScene
          ref={scene}
          mode="penalty"
          spot={PENALTY_SPOT}
          target={phase === "summary" ? null : targets[current]}
          onKickContact={(pace) => haptic.impact(pace > 0.6 ? "heavy" : "medium")}
        />
      </div>

      <AnimatePresence>
        {(phase === "power" || phase === "aim") && (
          <motion.div
            className="absolute right-4 top-1/2 -translate-y-1/2"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
          >
            <PowerMeter runningSince={gaugeSince} locked={power} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Верхняя панель: выход, удары и очки. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onExit}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Выйти из тренировки"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-background/60 text-foreground backdrop-blur"
        >
          <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </button>
        <div className="flex items-center gap-2 rounded-full bg-background/60 px-3 py-1.5 backdrop-blur" aria-live="polite">
          {Array.from({ length: TRAINING_SHOTS }).map((_, i) => {
            const s = shots[i];
            return (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${s ? ZONE_COPY[s.zone].dot : i === current && phase !== "summary" ? "bg-foreground/80 ring-2 ring-accent/60" : "bg-foreground/30"}`}
                aria-hidden
              />
            );
          })}
          <span className="t-caption ml-1 tabular-nums text-muted">{score} очк.</span>
        </div>
        <span className="h-10 w-10" aria-hidden />
      </div>

      {trail.length > 1 && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          <polyline
            points={trail.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      <AnimatePresence mode="wait">
        {phase === "power" && (
          <motion.div
            key="power"
            className="pointer-events-none absolute inset-x-0 bottom-[max(28px,env(safe-area-inset-bottom))] flex flex-col items-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className="t-small rounded-full bg-background/70 px-4 py-2 text-foreground backdrop-blur">
              Удар {current + 1} из {TRAINING_SHOTS}: поймай силу в голубой зоне
            </p>
            <p className="t-caption mt-2 text-foreground/70">Центр — 100 · среднее кольцо — 60 · внешнее — 30</p>
          </motion.div>
        )}
        {phase === "aim" && (
          <motion.div
            key="aim"
            className="pointer-events-none absolute inset-x-0 bottom-[max(28px,env(safe-area-inset-bottom))] flex flex-col items-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="mb-3 h-12 w-1 rounded-full bg-gradient-to-t from-accent/0 to-accent"
              animate={{ y: [12, -10, 12], opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <p className="t-small rounded-full bg-background/70 px-4 py-2 text-foreground backdrop-blur">
              {liveKind ? KIND_LABEL[liveKind] : "Нарисуй удар от мяча в мишень"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Итог удара. */}
      <AnimatePresence>
        {phase === "result" && last && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center bg-gradient-to-b from-background/70 via-transparent to-background/60 pt-[22dvh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <motion.p
              className={`text-[56px] font-bold leading-none tracking-[-0.03em] ${ZONE_COPY[last.zone].tone}`}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
            >
              {last.zone === "miss" && last.result === "post" ? "ШТАНГА" : ZONE_COPY[last.zone].title}
            </motion.p>
            <p className="t-small mt-4 rounded-full bg-accent/15 px-3 py-1.5 font-medium tabular-nums text-accent">
              +{last.points} · всего {score}
            </p>
            <div className="absolute inset-x-4 bottom-[max(24px,env(safe-area-inset-bottom))]">
              <Button fullWidth onClick={next}>
                {current + 1 >= TRAINING_SHOTS ? "Итоги тренировки" : "Следующий удар"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Итог тренировки. */}
      <AnimatePresence>
        {phase === "summary" && (
          <motion.div
            className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-background via-background/90 to-background/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-6">
              <p className="t-label text-accent">Тренировка · Точность</p>
              <h1 className="t-h1 mt-1 text-foreground">Итоги</h1>

              <div className="mt-5 flex items-end gap-4">
                <p className="text-[56px] font-bold leading-none tabular-nums tracking-[-0.03em] text-foreground">
                  {score}
                  <span className="t-body ml-1 font-medium text-muted">/ {TRAINING_SHOTS * 100}</span>
                </p>
                <div className="mb-2 flex gap-1" role="img" aria-label={`${stars} из 3 звёзд`}>
                  {[0, 1, 2].map((i) => (
                    <Star
                      key={i}
                      className={`h-8 w-8 ${i < stars ? "fill-draw text-draw" : "text-foreground/25"}`}
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  ))}
                </div>
              </div>
              <p className="t-small mt-2 text-muted">
                {nextStar != null
                  ? `До ${STAR_THRESHOLDS.indexOf(nextStar) + 1}-й звезды не хватило ${nextStar - score} ${plural(nextStar - score, "очка", "очков", "очков")}.`
                  : "Максимум звёзд — отличная точность!"}
              </p>

              <ul className="mt-4 flex gap-2">
                {shots.map((s, i) => (
                  <li key={i} className="flex flex-1 flex-col items-center rounded-xl bg-surface-2 py-2">
                    <span className="t-caption text-subtle">№{i + 1}</span>
                    <span className={`t-body font-semibold tabular-nums ${ZONE_COPY[s.zone].tone}`}>{s.points}</span>
                  </li>
                ))}
              </ul>

              <p className="t-caption mt-3 text-subtle">Тренировка без очков рейтинга и монет.</p>

              <div className="mt-5 flex flex-col gap-2">
                <Button fullWidth onClick={restart}>
                  Ещё раз
                </Button>
                <Button fullWidth variant="secondary" onClick={onExit}>
                  К тренировкам
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
