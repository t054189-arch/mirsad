import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, supabaseEnv } from "./env";

/**
 * Refreshes the Supabase Auth session on every request and writes the rotated
 * tokens back onto the response.
 *
 * Without this, server-rendered pages read stale tokens and users get logged
 * out at random.
 */
export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    // Lets `npm run dev` work before .env.local is filled in. In a deployed
    // environment the variables are always set, so this branch is not taken.
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  const { url, publishableKey } = supabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        // Stops CDNs from caching a response that carries someone's session.
        Object.entries(headers).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  // Do not run code between createServerClient and getClaims(). A mistake here
  // is very hard to debug — it shows up as users being logged out at random.
  await supabase.auth.getClaims();

  // To protect routes, add the redirect here — getClaims() returns the verified
  // claims, and unlike getSession() it cannot be spoofed by a forged cookie:
  //
  //   const { data } = await supabase.auth.getClaims()
  //   if (!data?.claims && !request.nextUrl.pathname.startsWith("/login")) {
  //     const url = request.nextUrl.clone()
  //     url.pathname = "/login"
  //     return NextResponse.redirect(url)
  //   }
  //
  // Left out for now because this app has no login page yet.

  // Return `supabaseResponse` as it is. If you need a different response, copy
  // its cookies over first (`res.cookies.setAll(supabaseResponse.cookies.getAll())`),
  // or the browser and server sessions drift apart.
  return supabaseResponse;
}
