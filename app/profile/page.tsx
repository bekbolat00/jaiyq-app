"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import ScreenHeader from "../components/ScreenHeader";
import TabEnterMotion from "../components/TabEnterMotion";
import DigitalTicket from "../components/DigitalTicket";
import NotificationBellButton from "../components/NotificationBellButton";
import NotificationsSheet from "../components/NotificationsSheet";
import AvatarUploadSheet, {
  type AvatarPickSource,
} from "../components/AvatarUploadSheet";
import ToggleSwitch from "../components/ToggleSwitch";
import { CURRENT_USER, NOTIFICATIONS, TICKETS } from "@/lib/data/mock";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const AVATAR_MAX_FILE_BYTES = 5 * 1024 * 1024;

type Filter = "active" | "archived";

type Rank = {
  id: string;
  title: string;
  minMatches: number;
};

const RANKS: Rank[] = [
  { id: "rookie", title: "Новичок", minMatches: 0 },
  { id: "fan", title: "Фанат", minMatches: 1 },
  { id: "legend", title: "Легенда", minMatches: 5 },
];

type Achievement = {
  id: string;
  title: string;
  icon: string;
  earned: boolean;
};

const ACHIEVEMENTS: Achievement[] = [
  { id: "first-ticket", title: "Первый билет", icon: "🎟", earned: true },
  { id: "loyal-fan", title: "Преданный фанат", icon: "🔥", earned: false },
  { id: "own-jersey", title: "Своя футболка", icon: "👕", earned: false },
];

const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

export default function ProfilePage() {
  const [filter, setFilter] = useState<Filter>("active");
  const [pushAway, setPushAway] = useState(CURRENT_USER.pushAwayMatches);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    CURRENT_USER.avatarUrl,
  );

  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const lastObjectUrlRef = useRef<string | null>(null);
  const avatarUploadGenRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedAvatar = localStorage.getItem("user_avatar");
    if (savedAvatar && !savedAvatar.startsWith("blob:")) {
      setAvatarUrl(savedAvatar);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = null;
      }
    };
  }, []);

  const triggerAvatarFilePick = useCallback((source: AvatarPickSource) => {
    const input = avatarFileInputRef.current;
    if (!input) return;
    input.accept = "image/*";
    if (source === "camera") {
      input.setAttribute("capture", "environment");
    } else {
      input.removeAttribute("capture");
    }
    input.click();
  }, []);

  const handleAvatarFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > AVATAR_MAX_FILE_BYTES) {
      console.error("[AvatarUpload] File too large (max 5 MB)", { size: file.size });
      return;
    }
    if (!file.type.startsWith("image/")) {
      console.error("[AvatarUpload] Not an image file", {
        type: file.type,
        name: file.name,
      });
      return;
    }

    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }

    const localUrl = URL.createObjectURL(file);
    lastObjectUrlRef.current = localUrl;

    setAvatarUrl(localUrl);
    if (typeof window !== "undefined") {
      localStorage.setItem("user_avatar", localUrl);
    }
    setAvatarSheetOpen(false);

    const uploadGeneration = ++avatarUploadGenRef.current;

    void (async () => {
      if (!isSupabaseConfigured()) {
        console.error(
          "[AvatarUpload] Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / anon key).",
        );
        return;
      }

      const ext =
        (file.name.includes(".") && file.name.split(".").pop()) ||
        (file.type === "image/png" ? "png" : "jpg");
      const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
      const objectName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;

      try {
        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(objectName, file, {
            contentType: file.type || "image/jpeg",
          });

        if (uploadErr) {
          console.error("[AvatarUpload] Storage upload failed", uploadErr);
          return;
        }

        if (uploadGeneration !== avatarUploadGenRef.current) return;

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(objectName);

        setAvatarUrl(publicUrl);
        if (typeof window !== "undefined") {
          localStorage.setItem("user_avatar", publicUrl);
        }
        if (lastObjectUrlRef.current === localUrl) {
          URL.revokeObjectURL(localUrl);
          lastObjectUrlRef.current = null;
        }
      } catch (err) {
        console.error("[AvatarUpload] Unexpected error during avatar upload", err);
      }
    })();
  }, []);

  const tickets = useMemo(
    () => TICKETS.filter((t) => t.status === filter),
    [filter],
  );

  const matchesAttended = TICKETS.filter((t) => t.status === "archived").length || 1;

  const { currentRank, nextRank, progressTo } = useMemo(() => {
    const sorted = [...RANKS].sort((a, b) => a.minMatches - b.minMatches);
    let curr = sorted[0];
    let next: Rank | null = null;
    for (let i = 0; i < sorted.length; i++) {
      if (matchesAttended >= sorted[i].minMatches) {
        curr = sorted[i];
        next = sorted[i + 1] ?? null;
      }
    }
    const target = next ? next.minMatches : curr.minMatches;
    return { currentRank: curr, nextRank: next, progressTo: target };
  }, [matchesAttended]);

  const progressPct = nextRank
    ? Math.min(100, Math.round((matchesAttended / progressTo) * 100))
    : 100;

  const initials = CURRENT_USER.displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const followers = CURRENT_USER.followersCount ?? 0;
  const following = CURRENT_USER.followingCount ?? 0;
  const hasUnreadNotifications = NOTIFICATIONS.some((n) => n.isNew);

  return (
    <>
      <TabEnterMotion className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 [&>header]:mb-0">
          <ScreenHeader eyebrow="Профиль" title="Личный кабинет" />

          {/* User card — Social Hub / шапка как в 1FIT */}
          <section className="glass-premium rounded-3xl p-4">
        <div className="flex gap-3">
          <div
            className="relative shrink-0 rounded-3xl p-[2px]"
            style={{
              background:
                "linear-gradient(135deg, #00f0ff 0%, rgba(0, 240, 255, 0.35) 100%)",
              boxShadow: "0 0 20px rgba(0, 240, 255, 0.25)",
            }}
          >
            <button
              type="button"
              onClick={() => setAvatarSheetOpen(true)}
              className="relative block overflow-hidden rounded-[22px] border border-[#020408] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 cursor-pointer"
              aria-label="Изменить фото профиля"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt=""
                  width={144}
                  height={144}
                  unoptimized={
                    avatarUrl.startsWith("blob:") || avatarUrl.startsWith("data:")
                  }
                  className="aspect-square h-[4.5rem] w-[4.5rem] rounded-3xl object-cover"
                />
              ) : (
                <div className="flex aspect-square h-[4.5rem] w-[4.5rem] items-center justify-center rounded-3xl bg-gradient-to-br from-white/12 to-white/[0.04] font-mono text-[1.15rem] font-bold text-foreground">
                  {initials}
                </div>
              )}
              <span
                className="pointer-events-none absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-[#020408]/95 text-accent shadow-lg backdrop-blur-sm"
                aria-hidden
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </span>
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted">
                  Болельщик
                </p>
                <p className="text-[17px] font-semibold leading-tight text-foreground">
                  {CURRENT_USER.displayName}
                </p>
              </div>
              <NotificationBellButton
                onClick={() => setNotificationsOpen(true)}
                hasUnread={hasUnreadNotifications}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <p className="text-2xl font-black tabular-nums leading-none text-foreground">
                  {followers}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                  ПОДПИСЧИКИ
                </p>
              </div>
              <div>
                <p className="text-2xl font-black tabular-nums leading-none text-foreground">
                  {following}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                  ПОДПИСКИ
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
        </div>

      {/* Fan journey / gamification */}
      <section className="space-y-3">
        <h2 className="px-1 text-[12px] font-bold uppercase tracking-widest text-muted">
          Путь болельщика
        </h2>

        <div className="glass-premium space-y-4 rounded-3xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center">
                <div
                  className="absolute inset-0 bg-accent/15"
                  style={{ clipPath: HEX_CLIP }}
                />
                <div
                  className="absolute inset-[2px] bg-gradient-to-br from-accent/40 to-accent/10"
                  style={{ clipPath: HEX_CLIP }}
                />
                <span className="relative text-base">⭐</span>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted">
                  Текущий ранг
                </p>
                <p className="text-[17px] font-semibold text-foreground">
                  {currentRank.title}
                </p>
              </div>
            </div>

            {nextRank && (
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-widest text-muted">
                  Следующий
                </p>
                <p className="neon-cyan text-[13px] font-bold text-accent">
                  {nextRank.title}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted">
                {nextRank
                  ? `Посещено матчей: ${matchesAttended}/${progressTo}`
                  : "Максимальный ранг достигнут"}
              </span>
              <span className="neon-cyan font-mono font-bold text-accent">
                {progressPct}%
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent/70 to-accent"
                style={{
                  width: `${progressPct}%`,
                  boxShadow: "0 0 12px rgba(0, 240, 255, 0.55)",
                }}
              />
            </div>
          </div>
        </div>

        <div className="glass-premium rounded-3xl p-4">
          <p className="mb-5 text-[12px] font-black uppercase tracking-[0.18em] text-muted">
            Достижения
          </p>
          <div className="grid grid-cols-3 gap-4">
            {ACHIEVEMENTS.map((a) => (
              <AchievementHex key={a.id} achievement={a} clip={HEX_CLIP} />
            ))}
          </div>
        </div>
      </section>

      {/* Settings */}
      <section className="space-y-3">
        <h2 className="px-1 text-[12px] font-bold uppercase tracking-widest text-muted">
          Настройки
        </h2>
        <ToggleSwitch
          checked={pushAway}
          onChange={setPushAway}
          label="Push-уведомления о выездных матчах"
          description="Получайте напоминания о стартовом свистке и важных событиях"
        />
      </section>

      {/* Tickets inventory */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="px-1 text-[12px] font-bold uppercase tracking-widest text-muted">
            Мои билеты
          </h2>
          <div className="glass-premium relative grid grid-cols-2 rounded-xl p-0.5 text-[12px]">
            <span
              aria-hidden
              className={`absolute inset-y-0.5 w-[calc(50%-2px)] rounded-lg bg-accent/15 ring-1 ring-accent/40 transition-transform ${
                filter === "active" ? "translate-x-0.5" : "translate-x-[calc(100%+1px)]"
              }`}
            />
            {(["active", "archived"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`relative z-10 px-3 py-1.5 font-semibold ${
                  filter === f ? "neon-cyan text-accent" : "text-muted"
                }`}
              >
                {f === "active" ? "Активные" : "ИСТОРИЯ"}
              </button>
            ))}
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="glass-premium rounded-2xl p-6 text-center text-[13px] text-muted">
            Билетов пока нет.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {tickets.map((t) => (
              <DigitalTicket key={t.id} ticket={t} />
            ))}
          </div>
        )}
      </section>
      </TabEnterMotion>

      <NotificationsSheet
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        items={NOTIFICATIONS}
      />
      <input
        ref={avatarFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={handleAvatarFileChange}
      />
      <AvatarUploadSheet
        open={avatarSheetOpen}
        onClose={() => setAvatarSheetOpen(false)}
        onPickSource={triggerAvatarFilePick}
      />
    </>
  );
}

function AchievementHex({
  achievement: a,
  clip,
}: {
  achievement: Achievement;
  clip: string;
}) {
  const earned = a.earned;
  const outerGlow = earned
    ? "drop-shadow(0 0 14px rgba(212, 175, 55, 0.85)) drop-shadow(0 0 28px rgba(255, 215, 100, 0.45))"
    : "drop-shadow(0 0 10px rgba(180, 190, 210, 0.35)) drop-shadow(0 0 20px rgba(140, 150, 170, 0.2))";

  const borderGrad = earned
    ? "linear-gradient(145deg, #fceabb 0%, #d4af37 22%, #8a7020 48%, #e8c547 72%, #f5e6a8 100%)"
    : "linear-gradient(155deg, #f0f4fa 0%, #b8c0d0 35%, #7a8498 55%, #d0d8e8 100%)";

  const faceGrad = earned
    ? "linear-gradient(168deg, rgba(18, 14, 8, 0.92) 0%, rgba(8, 6, 4, 0.88) 100%)"
    : "linear-gradient(168deg, rgba(14, 16, 22, 0.92) 0%, rgba(6, 8, 12, 0.9) 100%)";

  return (
    <div
      className={`flex flex-col items-center gap-2.5 ${earned ? "" : "opacity-[0.52]"}`}
    >
      <div
        className="relative flex h-[5.25rem] w-[5.25rem] items-center justify-center"
        style={{ filter: outerGlow }}
      >
        {earned && (
          <div
            aria-hidden
            className="absolute inset-[-6px] opacity-70"
            style={{
              clipPath: clip,
              background:
                "radial-gradient(circle at 50% 35%, rgba(255, 230, 150, 0.5), transparent 62%)",
              filter: "blur(10px)",
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            clipPath: clip,
            background: borderGrad,
            boxShadow: earned
              ? "inset 0 1px 0 rgba(255,255,255,0.45), 0 0 20px rgba(212,175,55,0.35)"
              : "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 12px rgba(180,190,210,0.25)",
          }}
        />
        <div
          className="absolute inset-[3px]"
          style={{
            clipPath: clip,
            background: faceGrad,
            boxShadow: "inset 0 0 24px rgba(0,0,0,0.45)",
          }}
        />
        <span className="relative z-[1] text-[1.65rem] leading-none">{a.icon}</span>
      </div>
      <p
        className={`text-center text-[11px] font-semibold leading-tight tracking-tight ${
          earned ? "text-foreground" : "text-muted"
        }`}
      >
        {a.title}
      </p>
    </div>
  );
}
