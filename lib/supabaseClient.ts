import { createClient } from "@supabase/supabase-js";

/** Used only so `createClient` receives valid strings during build when env is unset. */
const PLACEHOLDER_SUPABASE_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_SUPABASE_ANON_KEY = "public-anon-key";

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl = rawSupabaseUrl?.trim() || PLACEHOLDER_SUPABASE_URL;
const supabaseAnonKey = rawSupabaseAnonKey?.trim() || PLACEHOLDER_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function isSupabaseConfigured(): boolean {
  const url = rawSupabaseUrl?.trim() || "";
  const key = rawSupabaseAnonKey?.trim() || "";
  if (!url || !key) return false;
  if (url === PLACEHOLDER_SUPABASE_URL || key === PLACEHOLDER_SUPABASE_ANON_KEY) {
    return false;
  }
  return true;
}
