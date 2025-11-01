import { createClient as createSbClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Server-side privileged Supabase client.
 * Requires env SUPABASE_SERVICE_ROLE_KEY (do NOT expose to client).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createSbClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  });
}
