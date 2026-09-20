import { isSupabaseConfigured, supabaseEnv } from "./env";

export type SupabaseHealth =
  | { status: "unconfigured" }
  | { status: "ok"; projectRef: string }
  | { status: "error"; message: string };

/**
 * Checks that the configured URL and publishable key actually reach the
 * project. Used by the starter page so a broken deployment is obvious rather
 * than silent.
 *
 * The Auth health endpoint is the probe because the API gateway rejects it with
 * 401 unless the publishable key is valid. PostgREST's root (`/rest/v1/`) is not
 * usable here — it now serves the OpenAPI schema and requires a secret key.
 */
export async function checkSupabase(): Promise<SupabaseHealth> {
  if (!isSupabaseConfigured()) {
    return { status: "unconfigured" };
  }

  const { url, publishableKey } = supabaseEnv();

  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: publishableKey },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        status: "error",
        message: `Supabase responded with ${response.status}`,
      };
    }

    return { status: "ok", projectRef: new URL(url).hostname.split(".")[0] };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Project unreachable",
    };
  }
}
