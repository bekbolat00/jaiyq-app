"use client";

import { ChevronRight, Crosshair, Lock, MoveUpRight, Rocket, Spline, Zap, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import AccuracyDrill from "@/app/components/game/AccuracyDrill";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { unlockAudio } from "@/lib/game/sfx";
import { STAR_THRESHOLDS, TRAINING_SHOTS } from "@/lib/game/training";
import { haptic } from "@/lib/telegram/webApp";

type Drill = { id: string; title: string; hint: string; icon: LucideIcon; active: boolean };

/** Пока открыта только точность; остальные тренировки — анонс. */
const DRILLS: Drill[] = [
  {
    id: "accuracy",
    title: "Точность",
    hint: `${TRAINING_SHOTS} ударов по мишени · звёзды от ${STAR_THRESHOLDS[0]} очков`,
    icon: Crosshair,
    active: true,
  },
  { id: "shotPower", title: "Сила удара", hint: "Скоро", icon: Zap, active: false },
  { id: "curve", title: "Удар дугой", hint: "Скоро", icon: Spline, active: false },
  { id: "chip", title: "Парашют", hint: "Скоро", icon: MoveUpRight, active: false },
  { id: "longShot", title: "Дальний удар", hint: "Скоро", icon: Rocket, active: false },
];

/** Тренировочный центр «Забей гол»: выбор тренировки. Всё локально, без очков и монет. */
export default function TrainingCenter() {
  const router = useRouter();
  const [drill, setDrill] = useState<"accuracy" | null>(null);

  const back = useCallback(() => {
    if (drill) setDrill(null);
    else router.push("/game");
  }, [drill, router]);
  useTelegramBackButton(true, back);

  if (drill === "accuracy") return <AccuracyDrill onExit={() => setDrill(null)} />;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-background">
      <div className="px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))]">
        <button type="button" onClick={back} className="t-small -ml-1 px-1 py-2 text-muted">
          ← Забей гол
        </button>
        <p className="t-label mt-3 text-accent">Мини-игра</p>
        <h1 className="t-h1 mt-1 text-foreground">Тренировочный центр</h1>
        <p className="t-small mt-2 text-muted">Отрабатывай удары без ограничений. Тренировки не тратят попытки и не дают монет.</p>

        <ul className="mt-6 flex flex-col gap-2">
          {DRILLS.map((d) => {
            const Icon = d.icon;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  disabled={!d.active}
                  onClick={() => {
                    haptic.impact("light");
                    unlockAudio();
                    setDrill("accuracy");
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left transition-colors ${
                    d.active ? "bg-surface-2 hover:bg-[#13224f]" : "cursor-not-allowed bg-surface opacity-55"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      d.active ? "bg-accent/15 text-accent" : "bg-surface-2 text-subtle"
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="t-body block font-semibold text-foreground">{d.title}</span>
                    <span className="t-caption block text-muted">{d.hint}</span>
                  </span>
                  {d.active ? (
                    <ChevronRight className="h-5 w-5 text-muted" strokeWidth={1.75} aria-hidden />
                  ) : (
                    <Lock className="h-4 w-4 text-subtle" strokeWidth={1.75} aria-label="Скоро" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
