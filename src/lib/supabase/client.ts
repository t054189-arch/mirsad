import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

/**
 * Supabase client for Client Components.
 *
 * `createBrowserClient` is a singleton internally, so calling this on every
 * render is cheap.
 */
export function createClient() {
  const { url, publishableKey } = supabaseEnv();

  return createBrowserClient<Database>(url, publishableKey);
}
