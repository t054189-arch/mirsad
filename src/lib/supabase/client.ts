import { createBrowserClient } from "@supabase/ssr";

import { supabaseEnv } from "./env";

/**
 * Supabase client for Client Components.
 *
 * `createBrowserClient` is a singleton internally, so calling this on every
 * render is cheap.
 */
export function createClient() {
  const { url, publishableKey } = supabaseEnv();

  return createBrowserClient(url, publishableKey);
}
