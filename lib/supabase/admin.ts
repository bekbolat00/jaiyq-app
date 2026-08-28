import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/**
 * Service-role клиент — обходит RLS. Импортировать ТОЛЬКО из `app/api/*` route handlers.
 * Никогда не импортировать из клиентских компонентов ("use client") — ключ утечёт в бандл.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client misconfigured: set SUPABASE_SERVICE_ROLE_KEY in the server environment (never NEXT_PUBLIC_*).",
    );
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return adminClient;
}
