"use client";

/* eslint-disable @next/next/no-img-element -- вырезки игроков с разных доменов, next/image тут не помогает */

import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Shirt, X } from "lucide-react";
import type { Player } from "@/lib/types";
import { PRODUCTS } from "@/lib/data/mock";
import { positionFullLabel } from "@/lib/players/position";
import BrandWaves from "@/app/components/ui/BrandWaves";
import Button from "@/app/components/ui/Button";
import SectionHeader from "@/app/components/ui/SectionHeader";
import { playerInitials } from "@/app/components/PlayerCard";

type Props = {
  player: Player | null;
  onClose: () => void;
};

const EASE = [0.2, 0.8, 0.2, 1] as const;

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE } },
};

const CAREER_DEMO = [
  { season: "2023/2024", games: 12, goals: 4, assists: 2 },
  { season: "2022/2023", games: 18, goals: 6, assists: 3 },
  { season: "2021/2022", games: 15, goals: 2, assists: 1 },
  { season: "2020/2021", games: 8, goals: 0, assists: 0 },
] as const;

/** «ДД.ММ.ГГГГ» → полных лет, либо `null`. */
function ageFrom(birthDate: string): number | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(birthDate.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const now = new Date();
  let age = now.getFullYear() - Number(yyyy);
  const beforeBirthday =
    now.getMonth() + 1 < Number(mm) || (now.getMonth() + 1 === Number(mm) && now.getDate() < Number(dd));
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 100 ? age : null;
}

function birthYear(birthDate: string): string | null {
  const m = /(\d{4})$/.exec(birthDate.trim());
  return m ? m[1] : null;
}

export default function PlayerDetailSheet({ player, onClose }: Props) {
  useTelegramBackButton(player != null, onClose);
  useEffect(() => {
    if (!player) return;
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
  }, [player, onClose]);

  return (
    <AnimatePresence>
      {player && (
        <motion.div
          key={player.id}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal
          aria-labelledby="player-detail-title"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1, transition: { duration: 0.22 } }}
        >
          <motion.div
            role="presentation"
            className="absolute inset-0 bg-background/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.22 } }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            onClick={onClose}
          />

          <motion.div
            className="relative z-10 flex h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-b-0 border-line bg-surface sm:h-[88dvh] sm:rounded-3xl sm:border-b"
            initial={{ y: "100%" }}
            animate={{ y: 0, transition: { type: "spring", stiffness: 380, damping: 36 } }}
            exit={{ y: "100%", transition: { duration: 0.22, ease: EASE } }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Закрыть"
              onClick={onClose}
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-foreground transition-colors active:bg-navy"
            >
              <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </button>

            <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
              <PlayerHero player={player} />

              <motion.div
                className="flex flex-col gap-8 px-4 pb-4 pt-4"
                variants={stagger}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={item}>
                  <h1 id="player-detail-title" className="t-h1 text-foreground">
                    {player.firstName} {player.lastName}
                  </h1>
                  <p className="t-small mt-1 tabular-nums text-muted">
                    #{player.number} · {positionFullLabel(player.position)}
                  </p>
                </motion.div>

                <motion.div variants={item}>
                  <StatsGrid player={player} />
                </motion.div>

                <motion.section variants={item}>
                  <SectionHeader title="Биография" />
                  <div className="t-body space-y-3 text-muted">
                    <p>
                      Профессиональную карьеру начал в академии, затем закрепился в основе команды.
                      Отличается дисциплиной, техникой и умением читать игру: в важных матчах чаще
                      других оказывается на нужной позиции и вносит решающий вклад.
                    </p>
                    <p>
                      В составе &laquo;Жайыка&raquo; — один из опорных футболистов: стабильный уровень в
                      чемпионате, участие в еврокубках и работа над сильными сторонами в каждом сезоне.
                      Предан клубным ценностям и поддержке трибун.
                    </p>
                  </div>
                </motion.section>

                <motion.section variants={item}>
                  <SectionHeader title="Карьера" />
                  <div className="overflow-hidden rounded-2xl bg-surface-2">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-line">
                          <th className="t-caption py-3 pl-4 pr-2 text-subtle">Сезон</th>
                          <th className="t-caption px-2 py-3 text-right text-subtle">Матчи</th>
                          <th className="t-caption px-2 py-3 text-right text-subtle">Голы</th>
                          <th className="t-caption py-3 pl-2 pr-4 text-right text-subtle">Передачи</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {CAREER_DEMO.map((r) => (
                          <tr key={r.season} className="t-body tabular-nums">
                            <td className="py-3 pl-4 pr-2 text-foreground">{r.season}</td>
                            <td className="px-2 py-3 text-right text-muted">{r.games}</td>
                            <td className="px-2 py-3 text-right text-muted">{r.goals}</td>
                            <td className="py-3 pl-2 pr-4 text-right text-muted">{r.assists}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.section>

                <JerseyAction player={player} />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PlayerHero({ player }: { player: Player }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = player.photoUrl?.trim() || null;
  const showPhoto = src != null && failedSrc !== src;

  return (
    <motion.header
      className="relative h-[300px] w-full shrink-0 overflow-hidden bg-gradient-to-b from-navy to-surface"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: EASE }}
    >
      <BrandWaves className="absolute inset-x-0 bottom-6 h-24 w-full" opacity={0.2} />

      <div className="absolute inset-x-0 bottom-0 top-8 flex justify-center">
        {showPhoto ? (
          <img
            src={src}
            alt=""
            decoding="async"
            onError={() => setFailedSrc(src)}
            className="h-full w-auto max-w-full object-contain object-bottom"
          />
        ) : (
          <span className="mt-10 flex h-40 w-40 items-center justify-center rounded-full bg-navy/40">
            <span className="text-[56px] font-semibold leading-none tracking-[-0.03em] text-accent/70">
              {playerInitials(player.firstName, player.lastName)}
            </span>
          </span>
        )}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface to-transparent"
      />
    </motion.header>
  );
}

function StatsGrid({ player }: { player: Player }) {
  const age = ageFrom(player.birthDate);
  const year = birthYear(player.birthDate);
  const tiles: { label: string; value: string; unit?: string }[] = [
    { label: "Матчи", value: String(player.stats.games) },
    { label: "Голы", value: String(player.stats.goals) },
    { label: "Возраст", value: age != null ? String(age) : "—" },
    { label: "Рост", value: String(player.stats.heightCm), unit: "см" },
    { label: "Вес", value: String(player.stats.weightKg), unit: "кг" },
    { label: "Родился", value: year ?? "—" },
  ];

  return (
    <dl className="grid grid-cols-3 gap-2">
      {tiles.map((t) => (
        <div key={t.label} className="flex flex-col rounded-xl bg-surface-2 p-3">
          <dt className="t-caption order-last mt-0.5 text-muted">{t.label}</dt>
          <dd className="t-h3 tabular-nums text-foreground">
            {t.value}
            {t.unit && <span className="t-small ml-0.5 text-muted">{t.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function JerseyAction({ player }: { player: Player }) {
  const jersey = PRODUCTS.find((p) => p.id === player.jerseyProductId);
  return (
    <motion.div variants={item} className="pb-2">
      <Button fullWidth icon={<Shirt className="h-5 w-5" strokeWidth={1.75} aria-hidden />}>
        Купить футболку {player.lastName}
      </Button>
      {jersey && (
        <p className="t-small mt-2 text-center tabular-nums text-muted">
          {jersey.title} · {jersey.priceKzt.toLocaleString("ru-RU")} ₸
        </p>
      )}
    </motion.div>
  );
}
