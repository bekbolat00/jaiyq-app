"use client";

/* eslint-disable @next/next/no-img-element -- фото болельщиков из Telegram */

import { AnimatePresence, motion } from "framer-motion";
import { Coins, Trophy, Volume2, VolumeX, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PenaltySceneHandle } from "@/app/components/game/PenaltyScene";
import PowerMeter, { powerAt } from "@/app/components/game/PowerMeter";
import Button from "@/app/components/ui/Button";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import {
  freeKickSpotFromSeed,
  GOAL_HALF_WIDTH,
  GOAL_HEIGHT,
  PENALTY_SPOT,
  POWER_SWEET_MAX,
  POWER_SWEET_MIN,
  simulateShot,
  type GameMode,
  type KickSpot,
  type ShotInput,
  type ShotKind,
  type ShotOutcome,
  type ShotResult,
} from "@/lib/game/penalty";
import { isMuted, playCrowdReaction, preloadGameSounds, setMuted, startCrowdAmbient, stopCrowdAmbient, unlockAudio } from "@/lib/game/sfx";
import type { ScorerCandidate } from "@/lib/kff/scorers";
import { getTelegramInitData } from "@/lib/telegram/getInitData";
import { haptic } from "@/lib/telegram/webApp";

const PenaltyScene = dynamic(() => import("@/app/components/game/PenaltyScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-background" />,
});

/** power — ловим силу на пульсирующей шкале, aim — ведём траекторию, shooting — удар. */
type Phase = "intro" | "power" | "aim" | "shooting" | "result" | "summary";

type TodayShot = { attempt: number; result: ShotResult; points: number; topCorner: boolean };

type Status = { attemptsLeft: number; nextFreeKick: KickSpot | null; today: TodayShot[]; totalPoints: number; totalGoals: number };

type ScorerRow = { place: number; name: string; photoUrl: string | null; points: number; goals: number; isMe: boolean };

const RESULT_COPY: Record<ShotResult, { title: string; tone: string }> = {
  goal: { title: "ГОЛ!", tone: "text-accent" },
  saved: { title: "СЕЙВ", tone: "text-foreground" },
  post: { title: "ШТАНГА", tone: "text-draw" },
  miss: { title: "МИМО", tone: "text-muted" },
  wall: { title: "В СТЕНКУ", tone: "text-foreground" },
};

const MODE_LABEL: Record<GameMode, string> = { penalty: "Пенальти", freekick: "Штрафной" };

const KIND_LABEL: Record<ShotKind, string> = { straight: "Прямой", curl: "Крученый", lob: "Парашют", knuckle: "Наклбол" };

function randomSpot(): KickSpot {
  return freeKickSpotFromSeed(Math.floor(Math.random() * 2 ** 31));
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

async function postJson<T>(url: string, body: unknown): Promise<{ status: number; data: T | null }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: res.status, data: res.ok ? ((await res.json()) as T) : null };
}

type SwipePoint = { x: number; y: number; t: number };

/** Раньше этого шкалу поймать нельзя: чтобы случайное касание при старте не било «в ноль». */
const MIN_CHARGE_MS = 120;

/**
 * Тип удара по форме жеста. Все пороги — в долях длины хорды начало→конец,
 * чтобы не зависеть от размера экрана.
 *  - зигзаг (≥2 смены стороны) — наклбол, размах — амплитуда;
 *  - палец поднялся и заметно опустился — парашют, высота дуги — насколько;
 *  - одна дуга в сторону — крученый, закрутка — куда и насколько выгнули;
 *  - иначе — прямой.
 */
function classifySwipe(points: SwipePoint[]): { kind: ShotKind; curve: number; shape: number; peak: SwipePoint } | null {
  const a = points[0];
  const b = points[points.length - 1];
  const chord = Math.hypot(b.x - a.x, b.y - a.y);
  const peak = points.reduce((best, p) => (p.y < best.y ? p : best), a);
  const rise = a.y - peak.y; // на сколько палец вообще поднялся
  if (rise < 40 || chord < 24) return null;

  // Знаковое отклонение точек от хорды: слева/справа от прямой начало→конец.
  const dev = points.map((p) => ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / chord);
  const threshold = Math.max(6, chord * 0.06);
  let flips = 0;
  let side = 0;
  let firstSide = 0;
  let maxAbs = 0;
  let maxSigned = 0;
  for (const d of dev) {
    if (Math.abs(d) > Math.abs(maxSigned)) maxSigned = d;
    maxAbs = Math.max(maxAbs, Math.abs(d));
    if (Math.abs(d) < threshold) continue;
    const sgn = Math.sign(d);
    if (side && sgn !== side) flips++;
    if (!firstSide) firstSide = sgn;
    side = sgn;
  }

  const fall = b.y - peak.y; // на сколько опустился после пика
  if (flips >= 2) return { kind: "knuckle", curve: -firstSide, shape: Math.min(1, maxAbs / (chord * 0.25)), peak };
  if (fall > 40 && fall > rise * 0.25) return { kind: "lob", curve: 0, shape: Math.min(1, fall / (rise * 0.9)), peak };
  if (maxAbs > chord * 0.09) return { kind: "curl", curve: Math.max(-1, Math.min(1, -maxSigned / (chord * 0.28))), shape: 0, peak };
  return { kind: "straight", curve: 0, shape: 0, peak };
}

/**
 * Свайп прицела → параметры удара. Конец свайпа проецируется на плоскость ворот:
 * куда отпустил палец, туда (без разброса) прилетит мяч. Форма жеста задаёт тип
 * удара и его характер; сила уже поймана на шкале.
 */
function swipeToAim(
  points: SwipePoint[],
  power: number,
  mode: GameMode,
  goalPointAt: PenaltySceneHandle["goalPointAt"],
): ShotInput | null {
  if (points.length < 2) return null;
  const gesture = classifySwipe(points);
  if (!gesture) return null;
  const b = points[points.length - 1];
  const target = goalPointAt(b.x, b.y);
  if (!target) return null;
  const { kind, curve, shape } = gesture;

  // Закрутка сносит мяч вбок (см. shotPlan) — прицел компенсирует снос, чтобы мяч пришёл под палец.
  const curveFactor = kind === "curl" ? 1 : kind === "lob" ? 0.4 : 0;
  const drift = curve * curveFactor * (mode === "freekick" ? 2.3 : 1.1) * 0.35;

  return {
    kind,
    shape,
    aimX: Math.max(-1.6, Math.min(1.6, (target.x - drift) / GOAL_HALF_WIDTH)),
    aimY: Math.max(0, Math.min(1.6, target.y / GOAL_HEIGHT)),
    power,
    curve,
  };
}

export default function PenaltyGame() {
  const router = useRouter();
  const scene = useRef<PenaltySceneHandle>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [status, setStatus] = useState<Status | null>(null);
  const [practice, setPractice] = useState(false);
  const [mode, setMode] = useState<GameMode>("penalty");
  const [practiceSpot, setPracticeSpot] = useState<KickSpot>(() => PENALTY_SPOT);
  const [shooters, setShooters] = useState<ScorerCandidate[]>([]);
  const [shooterId, setShooterId] = useState<string | null>(null);
  const [last, setLast] = useState<{ outcome: ShotOutcome; coins: number | null } | null>(null);
  const [leaders, setLeaders] = useState<{ top: ScorerRow[]; me: ScorerRow | null } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const swipe = useRef<SwipePoint[]>([]);
  /** Когда шкала силы запустилась (фаза power) и какая сила поймана. */
  const [gaugeSince, setGaugeSince] = useState<number | null>(null);
  const [power, setPower] = useState<number | null>(null);
  /** Тип удара, распознанный по текущему жесту — подпись под прицелом. */
  const [liveKind, setLiveKind] = useState<ShotKind | null>(null);
  const [muted, setMutedState] = useState(false);
  const [inTelegram, setInTelegram] = useState(false);

  const exit = useCallback(() => router.push("/"), [router]);
  useTelegramBackButton(true, exit);

  const loadStatus = useCallback(async () => {
    const initData = getTelegramInitData();
    setInTelegram(Boolean(initData));
    if (!initData) {
      setStatus(null);
      return;
    }
    const res = await postJson<Status>("/api/game/penalty/status", { initData });
    if (res.status === 503) setNotice("Игра скоро заработает — клуб завершает настройку. Пока можно потренироваться.");
    setStatus(res.data);
  }, []);

  const loadLeaders = useCallback(async () => {
    const res = await postJson<{ top: ScorerRow[]; me: ScorerRow | null }>("/api/game/penalty/leaderboard", {
      initData: getTelegramInitData(),
    });
    setLeaders(res.data ?? { top: [], me: null });
  }, []);

  useEffect(() => {
    // Звук: качаем заранее, глушим при выходе из игры. Настройка — только на клиенте.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMutedState(isMuted());
    preloadGameSounds();
    return () => stopCrowdAmbient();
  }, []);

  useEffect(() => {
    // Статус и рейтинг зависят от Telegram — известны только на клиенте.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStatus();
    void loadLeaders();
    fetch("/api/players/scorers")
      .then((r) => (r.ok ? r.json() : { players: [] }))
      .then((d: { players: ScorerCandidate[] }) => {
        setShooters(d.players);
        setShooterId((id) => id ?? d.players[0]?.id ?? null);
      })
      .catch(() => {});
  }, [loadStatus, loadLeaders]);

  const spot: KickSpot =
    mode === "freekick" ? (practice ? practiceSpot : (status?.nextFreeKick ?? practiceSpot)) : PENALTY_SPOT;

  const attemptsLeft = status?.attemptsLeft ?? 0;
  const canPlayForPoints = inTelegram && status != null && attemptsLeft > 0;

  const start = (asPractice: boolean) => {
    haptic.impact("light");
    unlockAudio();
    startCrowdAmbient();
    setPractice(asPractice);
    if (mode === "freekick") setPracticeSpot(randomSpot());
    scene.current?.reset();
    setLast(null);
    setPower(null);
    setGaugeSince(performance.now());
    setPhase("power");
  };

  const shoot = async (input: ShotInput) => {
    setPhase("shooting");
    haptic.impact("medium");
    // Разбег начинается сразу: пока игрок бежит к мячу, сервер успевает посчитать удар.
    scene.current?.windUp();

    let outcome: ShotOutcome;
    let coins: number | null = null;
    if (practice) {
      outcome = simulateShot(input, Math.random, mode, spot);
    } else {
      const res = await postJson<{ outcome: ShotOutcome; attemptsLeft: number; coins: number | null; totalPoints: number }>(
        "/api/game/penalty/shoot",
        { initData: getTelegramInitData(), input, mode },
      );
      if (!res.data) {
        setNotice(
          res.status === 429
            ? "Попытки на сегодня закончились. Приходи завтра!"
            : "Не удалось ударить — проверь интернет и попробуй ещё раз.",
        );
        scene.current?.reset();
        setPhase(res.status === 429 ? "summary" : "aim");
        void loadStatus();
        return;
      }
      outcome = res.data.outcome;
      coins = res.data.coins;
      setStatus((s) =>
        s
          ? {
              ...s,
              attemptsLeft: res.data!.attemptsLeft,
              totalPoints: res.data!.totalPoints,
              today: [...s.today, { attempt: s.today.length + 1, result: outcome.result, points: outcome.points, topCorner: outcome.topCorner }],
            }
          : s,
      );
    }

    scene.current?.play(outcome, () => {
      setLast({ outcome, coins });
      setPhase("result");
      playCrowdReaction(outcome.result);
      if (outcome.result === "goal") haptic.notify("success");
      else if (outcome.result === "post") haptic.notify("warning");
      else haptic.notify("error");
    });
  };

  /** Поймать силу на бегущей шкале. */
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

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    haptic.select();
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
    const input = swipeToAim(swipe.current, power, mode, handle.goalPointAt);
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
    const input = handle ? swipeToAim(swipe.current, power, mode, handle.goalPointAt) : null;
    swipe.current = [];
    handle?.setAimPreview(null);
    setLiveKind(null);
    window.setTimeout(() => setTrail([]), 180);
    if (input) void shoot(input);
  };
  /** Telegram может отменить жест (системный свайп): прицел сбрасываем без удара. */
  const onPointerCancel = () => {
    swipe.current = [];
    scene.current?.setAimPreview(null);
    setLiveKind(null);
    setTrail([]);
  };

  const next = () => {
    if (practice && mode === "freekick") setPracticeSpot(randomSpot());
    scene.current?.reset();
    setLast(null);
    setPower(null);
    if (!practice && (status?.attemptsLeft ?? 0) <= 0) {
      setPhase("summary");
      void loadLeaders();
      return;
    }
    setGaugeSince(performance.now());
    setPhase("power");
  };

  const todayGoals = status?.today.filter((s) => s.result === "goal").length ?? 0;
  const todayCoins = status?.today.reduce((sum, s) => sum + (s.result === "goal" ? (s.topCorner ? 10 : 5) : 0), 0) ?? 0;

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
        <PenaltyScene ref={scene} mode={mode} spot={spot} onKickContact={(pace) => haptic.impact(pace > 0.6 ? "heavy" : "medium")} />
      </div>

      {/* Шкала силы: пока набираем и пока целимся. */}
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

      {/* Верхняя панель: закрыть, режим, попытки. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={exit}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Закрыть игру"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-background/60 text-foreground backdrop-blur"
        >
          <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </button>
        {phase !== "intro" && (
          <div className="flex items-center gap-2 rounded-full bg-background/60 px-3 py-1.5 backdrop-blur">
            {practice ? (
              <span className="t-caption text-muted">Тренировка · {MODE_LABEL[mode]}</span>
            ) : (
              <>
                {Array.from({ length: 3 }).map((_, i) => {
                  const shot = status?.today[i];
                  return (
                    <span
                      key={i}
                      className={`h-2.5 w-2.5 rounded-full ${
                        !shot ? "bg-foreground/80" : shot.result === "goal" ? "bg-accent" : "bg-loss/80"
                      }`}
                      aria-hidden
                    />
                  );
                })}
                <span className="t-caption ml-1 text-muted">
                  {attemptsLeft} из 3
                </span>
              </>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={toggleMute}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={muted ? "Включить звук" : "Выключить звук"}
          aria-pressed={muted}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-background/60 text-foreground backdrop-blur"
        >
          {muted ? <VolumeX className="h-5 w-5" strokeWidth={1.75} aria-hidden /> : <Volume2 className="h-5 w-5" strokeWidth={1.75} aria-hidden />}
        </button>
      </div>

      {/* След пальца — тонкий: главный ориентир при прицеливании — пунктир траектории в сцене. */}
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

      {/* Подсказка перед ударом. */}
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
              Нажми, когда шкала в голубой зоне
            </p>
            <p className="t-caption mt-2 text-foreground/70">Слабо — мяч катится · до упора — теряешь точность</p>
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
              {liveKind ? KIND_LABEL[liveKind] : "Нарисуй удар от мяча к воротам"}
            </p>
            <p className="t-caption mt-2 text-center text-foreground/70">
              Прямо · дугой — крученый · вверх и вниз — парашют · зигзагом — наклбол
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
              className={`text-[64px] font-bold leading-none tracking-[-0.03em] ${RESULT_COPY[last.outcome.result].tone}`}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
            >
              {last.outcome.topCorner ? "В ДЕВЯТКУ!" : RESULT_COPY[last.outcome.result].title}
            </motion.p>
            {!practice && last.outcome.result === "goal" && (
              <motion.div
                className="mt-4 flex items-center gap-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <span className="t-small rounded-full bg-accent/15 px-3 py-1.5 font-medium text-accent">
                  +{last.outcome.points} {plural(last.outcome.points, "очко", "очка", "очков")}
                </span>
                <span className="t-small inline-flex items-center gap-1.5 rounded-full bg-draw/15 px-3 py-1.5 font-medium text-draw">
                  <Coins className="h-4 w-4" strokeWidth={1.75} aria-hidden />+{last.outcome.coins}
                </span>
              </motion.div>
            )}
            {practice && <p className="t-small mt-3 text-muted">Тренировка — без очков</p>}
            <div className="absolute inset-x-4 bottom-[max(24px,env(safe-area-inset-bottom))]">
              <Button fullWidth onClick={next}>
                {!practice && attemptsLeft <= 0 ? "Итоги дня" : "Ещё удар"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Старт и итоги дня. */}
      <AnimatePresence>
        {(phase === "intro" || phase === "summary") && (
          <motion.div
            className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-background via-background/85 to-background/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="max-h-[78dvh] overflow-y-auto px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-6">
              <p className="t-label text-accent">Мини-игра</p>
              <h1 className="t-h1 mt-1 text-foreground">{phase === "summary" ? "Итоги дня" : "Забей гол"}</h1>

              {phase === "intro" ? (
                <p className="t-small mt-2 text-muted">
                  3 удара в день.{" "}
                  {mode === "penalty"
                    ? "Пенальти: гол — 1 очко и 5 монет, в девятку — 2 очка и 10 монет."
                    : "Штрафной: гол — 2 очка и 10 монет, в девятку — 3 очка и 15 монет. Перебрось стенку или обведи её закруткой."}
                </p>
              ) : (
                <p className="t-small mt-2 text-muted">
                  Сегодня {todayGoals} {plural(todayGoals, "гол", "гола", "голов")} из 3 · +{todayCoins} монет. Новые попытки — завтра.
                </p>
              )}

              {notice && <p className="t-small mt-3 rounded-xl bg-surface-2 px-3 py-2 text-foreground/90">{notice}</p>}

              {phase === "intro" && (
                <>
                  <div className="mt-5 flex gap-2" role="radiogroup" aria-label="Режим">
                    {(["penalty", "freekick"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={mode === m}
                        onClick={() => {
                          if (mode !== m) haptic.select();
                          setMode(m);
                          if (m === "freekick") setPracticeSpot(randomSpot());
                        }}
                        className={`t-small rounded-lg px-3 py-2 font-medium transition-colors ${
                          mode === m ? "bg-foreground text-background" : "bg-surface-2 text-muted"
                        }`}
                      >
                        {MODE_LABEL[m]}
                      </button>
                    ))}
                  </div>

                  {shooters.length > 0 && (
                    <div className="mt-5">
                      <p className="t-label mb-2 text-subtle">Кто бьёт</p>
                      <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Кто бьёт">
                        {shooters.slice(0, 10).map((p) => {
                          const sel = p.id === shooterId;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              role="radio"
                              aria-checked={sel}
                              onClick={() => {
                                if (!sel) haptic.select();
                                setShooterId(p.id);
                              }}
                              className={`flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-xl py-2 transition-colors ${
                                sel ? "bg-accent/12 ring-2 ring-inset ring-accent" : "bg-surface-2"
                              }`}
                            >
                              <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-navy/60 text-[13px] font-semibold text-accent/80">
                                {p.photoUrl ? (
                                  <img src={p.photoUrl} alt="" className="h-full w-full object-cover object-top" />
                                ) : (
                                  `${p.surname.charAt(0)}${p.firstName.charAt(0)}`.toUpperCase()
                                )}
                              </span>
                              <span className="t-caption w-full truncate px-1 text-center text-foreground">{p.surname}</span>
                              <span className="t-caption -mt-1 tabular-nums text-subtle">№ {p.number}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="mt-5 flex flex-col gap-2">
                {canPlayForPoints && phase === "intro" ? (
                  <Button fullWidth onClick={() => start(false)}>
                    {mode === "penalty" ? "Бить пенальти" : "Бить штрафной"} · {attemptsLeft} из 3
                  </Button>
                ) : (
                  <Button fullWidth variant={phase === "intro" ? "primary" : "secondary"} onClick={() => start(true)}>
                    Тренировка без очков
                  </Button>
                )}
                {!inTelegram && (
                  <p className="t-caption text-center text-subtle">Играть на очки можно в приложении внутри Telegram</p>
                )}
              </div>

              <section className="mt-8">
                <div className="mb-3 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-draw" strokeWidth={1.75} aria-hidden />
                  <h2 className="t-h2 text-foreground">Бомбардиры</h2>
                </div>
                {leaders && leaders.top.length === 0 ? (
                  <p className="t-small rounded-2xl bg-surface px-4 py-4 text-muted">
                    Пока никто не забил. Стань первым в рейтинге!
                  </p>
                ) : (
                  <ul className="card divide-y divide-line overflow-hidden">
                    {(leaders?.top ?? []).slice(0, 5).map((r) => (
                      <li key={`${r.place}-${r.name}`} className={`flex items-center gap-3 px-4 py-3 ${r.isMe ? "bg-accent/[0.06]" : ""}`}>
                        <span className="t-small w-5 tabular-nums text-subtle">{r.place}</span>
                        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-[12px] font-semibold text-muted">
                          {r.photoUrl ? <img src={r.photoUrl} alt="" className="h-full w-full object-cover" /> : r.name.charAt(0)}
                        </span>
                        <span className="t-body min-w-0 flex-1 truncate text-foreground">{r.name}</span>
                        <span className="t-caption text-muted">
                          {r.goals} {plural(r.goals, "гол", "гола", "голов")}
                        </span>
                        <span className="t-body w-8 text-right font-semibold tabular-nums text-foreground">{r.points}</span>
                      </li>
                    ))}
                    {leaders?.me && leaders.me.place > 5 && (
                      <li className="flex items-center gap-3 bg-accent/[0.06] px-4 py-3">
                        <span className="t-small w-5 tabular-nums text-accent">{leaders.me.place}</span>
                        <span className="t-body min-w-0 flex-1 truncate font-medium text-foreground">Ты</span>
                        <span className="t-body w-8 text-right font-semibold tabular-nums text-accent">{leaders.me.points}</span>
                      </li>
                    )}
                  </ul>
                )}
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
