"use client";

/* eslint-disable @next/next/no-img-element -- вырезки игроков и логотипы с kffleague.kz */

import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { playerInitials } from "@/app/components/PlayerCard";
import BrandWaves from "@/app/components/ui/BrandWaves";
import Crest from "@/app/components/ui/Crest";
import { ResultBadge, outcomeFor } from "@/app/components/ui/Badges";
import SectionHeader from "@/app/components/ui/SectionHeader";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import type { PlayerProfile } from "@/lib/kff/playerProfile";
import { positionFullLabel } from "@/lib/players/position";
import type { RosterPlayer } from "@/lib/team/fetchTeamRoster";
import { displayCase } from "@/lib/text/displayCase";

type Props = {
  player: RosterPlayer | null;
  onClose: () => void;
};

const EASE = [0.2, 0.8, 0.2, 1] as const;

function formatBirth(iso: string | null): string {
  const m = (iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "—";
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ageFrom(iso: string | null): number | null {
  const m = (iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const b = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) age -= 1;
  return age > 0 && age < 60 ? age : null;
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

/** Кольцо «часть от целого» — удары в створ, точность передач, единоборства. */
function StatRing({ value, total, label, sub }: { value: number; total: number; label: string; sub: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
      <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--line-strong)" strokeWidth="6" />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - ratio) }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
        />
      </svg>
      <div className="min-w-0">
        <p className="t-h3 tabular-nums text-foreground">
          {value}
          <span className="t-small text-subtle"> / {total}</span>
        </p>
        <p className="t-caption text-foreground/90">{label}</p>
        <p className="t-caption text-subtle">{sub}</p>
      </div>
    </div>
  );
}

function Tile({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-3">
      <p className={`t-h1 tabular-nums ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
      <p className="t-caption mt-1 text-muted">{label}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <p className="t-label text-subtle">{label}</p>
      <p className="t-body mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

function useProfile(player: RosterPlayer | null) {
  const [state, setState] = useState<{ status: "idle" | "loading" | "ok" | "error"; data: PlayerProfile | null }>({
    status: "idle",
    data: null,
  });

  useEffect(() => {
    if (!player) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- запрос начинается при открытии шторки
    setState({ status: "loading", data: null });
    const q = new URLSearchParams({ number: player.number, surname: player.surname });
    fetch(`/api/players/profile?${q}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as PlayerProfile;
      })
      .then((data) => {
        if (!cancelled) setState({ status: "ok", data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [player]);

  return state;
}

/**
 * Карточка игрока основного состава: физические данные, статистика сезона
 * и последние матчи с kffleague.kz. Пока KFF отвечает — показываем то, что
 * уже есть в нашей базе (рост, вес, голы, матчи, минуты).
 */
export default function PlayerProfileSheet({ player, onClose }: Props) {
  useTelegramBackButton(player != null, onClose);
  const profile = useProfile(player);

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

  const p = profile.data;
  const stats = p?.stats ?? null;
  const height = p?.heightCm ?? player?.heightCm ?? null;
  const weight = p?.weightKg ?? player?.weightKg ?? null;
  const birth = p?.birthDate ?? player?.birthDate ?? null;
  const age = p?.age ?? ageFrom(birth);
  const games = stats?.games ?? player?.matchesPlayed ?? null;
  const goals = stats?.goals ?? player?.goals ?? null;
  const minutes = stats?.minutes ?? player?.minutesPlayed ?? null;
  const role = p?.role ?? (player ? positionFullLabel(player.position) : "");
  const photo = player?.photoUrl ?? p?.photoUrl ?? null;

  return (
    <AnimatePresence>
      {player && (
        <motion.div
          key={player.id}
          className="fixed inset-0 z-[70] flex flex-col justify-end"
          role="dialog"
          aria-modal
          aria-labelledby="player-sheet-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          <motion.div role="presentation" className="absolute inset-0 bg-background/80" onClick={onClose} />

          <motion.div
            className="relative z-10 mx-auto flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-b-0 border-line bg-surface"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Закрыть"
              onClick={onClose}
              className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-background/60 text-foreground backdrop-blur"
            >
              <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </button>

            <div className="overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {/* Шапка: номер и имя слева, вырезка фото справа, волны герба снизу. */}
              <div
                className={`relative overflow-hidden ${photo ? "h-[300px]" : "h-[220px]"}`}
                style={{ background: "linear-gradient(170deg, var(--navy) 0%, #0b1a57 45%, var(--surface) 100%)" }}
              >
                <BrandWaves className="absolute inset-x-0 bottom-0 h-24 w-full" opacity={0.18} />
                <div className="absolute inset-y-0 right-0 flex w-[58%] items-end justify-center">
                  {photo ? (
                    <img src={photo} alt="" className="max-h-[290px] w-auto object-contain object-bottom" />
                  ) : (
                    <span className="mb-14 flex h-28 w-28 items-center justify-center rounded-full bg-navy/50 text-[40px] font-semibold text-accent/70">
                      {playerInitials(player.firstName, player.surname)}
                    </span>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface to-transparent" aria-hidden />
                <div className="relative flex h-full flex-col justify-end p-5 pr-[45%]">
                  <p className="text-[64px] font-bold leading-none tracking-[-0.04em] tabular-nums text-accent">
                    {player.number !== "—" ? player.number : ""}
                  </p>
                  <p className="t-body mt-2 text-muted">{displayCase(player.firstName)}</p>
                  <h2 id="player-sheet-title" className="t-h1 text-foreground [overflow-wrap:anywhere]">
                    {displayCase(player.surname)}
                  </h2>
                </div>
              </div>

              <div className="px-4">
                {/* Факты: амплуа, дата рождения, рост, вес — как в референсе. */}
                <div className="card grid grid-cols-2 divide-x divide-y divide-line overflow-hidden [&>*:nth-child(3)]:border-l-0">
                  <Fact label="Амплуа" value={role || "—"} />
                  <Fact label="Дата рождения" value={birth ? `${formatBirth(birth)}${age ? ` · ${age}` : ""}` : "—"} />
                  <Fact label="Рост" value={height ? `${height} см` : "—"} />
                  <Fact label="Вес" value={weight ? `${weight} кг` : "—"} />
                </div>

                <SectionHeader title="Статистика сезона" className="mt-8" />
                {profile.status === "error" && !stats && (
                  <p className="t-small mb-3 flex items-center gap-2 text-muted">
                    <CircleAlert className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    Подробная статистика KFF сейчас недоступна — показаны данные из базы клуба.
                  </p>
                )}
                <motion.div
                  className="grid grid-cols-2 gap-2"
                  initial="hidden"
                  animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
                >
                  {[
                    { value: goals ?? "—", label: "Голы", accent: true },
                    { value: stats?.assists ?? "—", label: "Голевые передачи" },
                    { value: games ?? "—", label: stats ? `Матчи · ${stats.starts} в старте` : "Матчи" },
                    { value: minutes ?? "—", label: "Минут на поле" },
                    { value: stats?.xg != null ? stats.xg.toFixed(2) : "—", label: "xG — ожидаемые голы" },
                    { value: stats?.keyPasses ?? "—", label: "Ключевые передачи" },
                  ].map((t) => (
                    <motion.div key={t.label} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
                      <Tile value={t.value} label={t.label} accent={t.accent} />
                    </motion.div>
                  ))}
                </motion.div>

                {stats && (
                  <div className="mt-2 grid gap-2">
                    <StatRing value={stats.shotsOnTarget} total={stats.shots} label="Удары в створ" sub={`из ${stats.shots} ${plural(stats.shots, "удара", "ударов", "ударов")}`} />
                    <StatRing
                      value={stats.passAccuracy != null ? Math.round((stats.passes * stats.passAccuracy) / 100) : 0}
                      total={stats.passes}
                      label="Точные передачи"
                      sub={stats.passAccuracy != null ? `${Math.round(stats.passAccuracy)}% точности` : "—"}
                    />
                    <StatRing value={stats.duelsWon} total={stats.duels} label="Выигранные единоборства" sub={stats.duels ? `${Math.round((stats.duelsWon / stats.duels) * 100)}% успешных` : "—"} />
                    {(stats.yellowCards > 0 || stats.redCards > 0) && (
                      <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                        <span className="h-5 w-3.5 rounded-[2px] bg-draw" aria-hidden />
                        <span className="t-small text-foreground">{stats.yellowCards}</span>
                        <span className="ml-2 h-5 w-3.5 rounded-[2px] bg-loss" aria-hidden />
                        <span className="t-small text-foreground">{stats.redCards}</span>
                        <span className="t-caption ml-auto text-muted">Карточки за сезон</span>
                      </div>
                    )}
                  </div>
                )}

                {profile.status === "loading" && (
                  <div className="mt-2 grid gap-2" aria-busy>
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-[88px] animate-pulse rounded-xl bg-surface-2" />
                    ))}
                  </div>
                )}

                {p && p.matches.length > 0 && (
                  <>
                    <SectionHeader title="Последние матчи" className="mt-8" />
                    <ul className="card divide-y divide-line overflow-hidden">
                      {p.matches.slice(0, 6).map((m) => {
                        const outcome = outcomeFor(m.zhaiyqScore, m.opponentScore);
                        const d = new Date(m.date);
                        return (
                          <li key={m.kffGameId} className="flex items-center gap-3 px-4 py-3">
                            <div className="flex w-9 shrink-0 flex-col items-center">
                              <span className="t-h3 tabular-nums text-foreground">{d.getDate()}</span>
                              <span className="t-caption -mt-0.5 text-subtle">
                                {d.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "")}
                              </span>
                            </div>
                            <Crest src={m.opponentLogo} size={32} />
                            <div className="min-w-0 flex-1">
                              <p className="t-body truncate font-medium text-foreground">{m.opponent}</p>
                              <p className="t-caption text-muted">
                                {m.minutes}′{m.started ? "" : " · вышел на замену"}
                                {m.goals > 0 && ` · ${m.goals} ${plural(m.goals, "гол", "гола", "голов")}`}
                                {m.assists > 0 && ` · ${m.assists} ${plural(m.assists, "передача", "передачи", "передач")}`}
                              </p>
                            </div>
                            <span className="t-h3 tabular-nums text-foreground">
                              {m.zhaiyqScore ?? "–"}
                              <span className="px-0.5 text-subtle">:</span>
                              {m.opponentScore ?? "–"}
                            </span>
                            {outcome && <ResultBadge outcome={outcome} />}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
