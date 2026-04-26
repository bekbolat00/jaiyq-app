"use client";

import { useEffect } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export default function TelegramAuth() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.Telegram?.WebApp) return;

    const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
    if (!tgUser) return;

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
    if (!supabaseUrl) {
      console.error("[TelegramAuth] NEXT_PUBLIC_SUPABASE_URL is empty");
      return;
    }

    if (!isSupabaseConfigured()) {
      console.error(
        "[TelegramAuth] Supabase not configured: check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
      );
      return;
    }

    try {
      localStorage.setItem("tg_user_id", String(tgUser.id));
    } catch (e) {
      console.error("[TelegramAuth] localStorage failed", e);
    }

    const row = {
      telegram_id: tgUser.id,
      username: tgUser.username ?? "",
      first_name: tgUser.first_name ?? "",
      last_name: tgUser.last_name ?? "",
      photo_url: tgUser.photo_url ?? "",
    };

    void (async () => {
      try {
        const { error } = await supabase.from("users").upsert([row], {
          onConflict: "telegram_id",
        });
        if (error) {
          console.error("[TelegramAuth] Supabase upsert failed", error);
        }
      } catch (e) {
        console.error("[TelegramAuth] network or unexpected error", e);
      }
    })();
  }, []);

  return null;
}
