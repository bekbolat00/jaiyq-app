"use client";

/* eslint-disable @next/next/no-img-element -- аватар 72px из Telegram/Supabase/blob, оптимизация next/image не нужна */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Flame, Pencil, Shirt, Ticket, type LucideIcon } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import TabEnterMotion from "../components/TabEnterMotion";
import MyTicketsSection from "../components/MyTicketsSection";
import FanLeaderboardSection from "../components/FanLeaderboardSection";
import AdminMatchSyncPanel from "../components/AdminMatchSyncPanel";
import { useMatchNotifications } from "@/app/hooks/useMatchNotifications";
import NotificationBellButton from "../components/NotificationBellButton";
import NotificationsSheet from "../components/NotificationsSheet";
import AvatarUploadSheet, {
  type AvatarPickSource,
} from "../components/AvatarUploadSheet";
import ToggleSwitch from "../components/ToggleSwitch";
import BrandWaves from "../components/ui/BrandWaves";
import SectionHeader from "../components/ui/SectionHeader";
import { CURRENT_USER, NOTIFICATIONS, TICKETS } from "@/lib/data/mock";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const AVATAR_MAX_FILE_BYTES = 5 * 1024 * 1024;

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
  icon: LucideIcon;
  earned: boolean;
};

const ACHIEVEMENTS: Achievement[] = [
  { id: "first-ticket", title: "Первый билет", icon: Ticket, earned: true },
  { id: "loyal-fan", title: "Преданный фанат", icon: Flame, earned: false },
  { id: "own-jersey", title: "Своя форма", icon: Shirt, earned: false },
];

type TelegramIdentity = { firstName?: string; photoUrl?: string };

export default function ProfilePage() {
  const matchNotifications = useMatchNotifications();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    CURRENT_USER.avatarUrl,
  );
  const [tgUser, setTgUser] = useState<TelegramIdentity>({});

  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const lastObjectUrlRef = useRef<string | null>(null);
  const avatarUploadGenRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedAvatar = localStorage.getItem("user_avatar");
    if (savedAvatar && !savedAvatar.startsWith("blob:")) {
      queueMicrotask(() => setAvatarUrl(savedAvatar));
    }
  }, []);

  // Имя и фото из Telegram доступны только на клиенте.
  useEffect(() => {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!user) return;
    queueMicrotask(() =>
      setTgUser({ firstName: user.first_name, photoUrl: user.photo_url }),
    );
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

  const displayName = tgUser.firstName || CURRENT_USER.displayName;
  const shownAvatar = avatarUrl || tgUser.photoUrl;
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hasUnreadNotifications = NOTIFICATIONS.some((n) => n.isNew);

  return (
    <>
      <TabEnterMotion className="flex flex-col gap-8">
        <div className="flex flex-col [&>header]:mb-0">
          <ScreenHeader title="Профиль" />

          {/* Шапка болельщика: без карточки, с фирменными волнами герба */}
          <section className="relative -mx-4 mt-4 overflow-hidden px-4 pb-8 pt-2">
            <BrandWaves
              className="absolute inset-x-0 bottom-0 h-14 w-full"
              opacity={0.14}
            />
            <div className="relative flex items-center gap-4">
              <button
                type="button"
                onClick={() => setAvatarSheetOpen(true)}
                className="relative h-[72px] w-[72px] shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                aria-label="Изменить фото профиля"
              >
                {shownAvatar ? (
                  <img
                    src={shownAvatar}
                    alt=""
                    width={72}
                    height={72}
                    className="h-[72px] w-[72px] rounded-full border border-line object-cover"
                  />
                ) : (
                  <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-line bg-navy text-[24px] font-semibold text-foreground">
                    {initials}
                  </span>
                )}
                <span
                  className="pointer-events-none absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-foreground ring-2 ring-background"
                  aria-hidden
                >
                  <Pencil className="h-3 w-3" strokeWidth={2} />
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <p className="t-h2 truncate text-foreground">{displayName}</p>
                <p className="t-small mt-0.5 text-muted">Болельщик ФК Жайык</p>
              </div>

              <NotificationBellButton
                onClick={() => setNotificationsOpen(true)}
                hasUnread={hasUnreadNotifications}
              />
            </div>
          </section>
        </div>

        <section>
          <SectionHeader title="Мои билеты" />
          <MyTicketsSection />
        </section>

        <section>
          <SectionHeader title="Путь болельщика" />
          <div className="card">
            <div className="p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="t-h3 text-foreground">{currentRank.title}</p>
                {nextRank && (
                  <p className="t-small text-muted">Следующий: {nextRank.title}</p>
                )}
              </div>
              <div
                className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-label="Прогресс до следующего ранга"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPct}
              >
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="t-caption mt-2 tabular-nums text-muted">
                {nextRank
                  ? `Посещено матчей: ${matchesAttended} из ${progressTo}`
                  : "Максимальный ранг достигнут"}
              </p>
            </div>

            <ul
              className="grid grid-cols-3 gap-2 border-t border-line px-2 py-4"
              aria-label="Достижения"
            >
              {ACHIEVEMENTS.map((a) => (
                <AchievementItem key={a.id} achievement={a} />
              ))}
            </ul>
          </div>
        </section>

        <FanLeaderboardSection />

        <section>
          <SectionHeader title="Настройки" />
          <div className="card divide-y divide-line overflow-hidden">
            <ToggleSwitch
              checked={matchNotifications.enabled === true}
              onChange={(next) => {
                if (matchNotifications.busy || matchNotifications.unavailable) return;
                void matchNotifications.setEnabled(next);
              }}
              label="Уведомления о матчах"
              description={
                matchNotifications.unavailable
                  ? "Доступно в приложении внутри Telegram"
                  : "За час до начала — со ссылкой на трансляцию, и итог после финального свистка"
              }
            />
          </div>
          {matchNotifications.error && (
            <p className="t-small mt-2 px-1 text-loss">{matchNotifications.error}</p>
          )}
        </section>

        <AdminMatchSyncPanel />
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

function AchievementItem({ achievement: a }: { achievement: Achievement }) {
  const Icon = a.icon;
  return (
    <li className="flex flex-col items-center gap-2 text-center">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full ${
          a.earned ? "bg-accent/10 text-accent" : "bg-surface-2 text-subtle"
        }`}
        aria-hidden
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className={`t-caption ${a.earned ? "text-foreground" : "text-subtle"}`}>
        {a.title}
        <span className="sr-only">{a.earned ? " — получено" : " — ещё не получено"}</span>
      </span>
    </li>
  );
}
