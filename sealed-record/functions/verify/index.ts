// GET /verify?seal=<id> — the public endpoint on every printed report.
//
// It recomputes the fingerprint on the server, through verify_seal(), and says
// whether the copy in the reader's hands still matches what was sealed. It has
// no access to finding text and returns none.

import { renderVerifyPage } from '../_shared/page.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const headers = (type: string) => ({
  'content-type': type,
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
});

async function verify(sealId: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_seal`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: ANON_KEY!,
      authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ p_seal_id: sealId }),
  });
  if (!response.ok) throw new Error(`verify_seal failed: ${response.status}`);
  return await response.json();
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('method not allowed', { status: 405, headers: headers('text/plain') });
  }

  const seal = new URL(request.url).searchParams.get('seal')?.trim() ?? '';
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');

  // an absent or malformed seal is answered exactly like an unknown one, so the
  // endpoint cannot be used to probe which seal numbers exist
  const result = /^MRS-[0-9A-F]{16}$/.test(seal)
    ? await verify(seal)
    : { seal_id: seal, result: 'not_found' };

  if (wantsJson) {
    return new Response(JSON.stringify(result), { status: 200, headers: headers('application/json') });
  }
  return new Response(renderVerifyPage(result), {
    status: 200,
    headers: headers('text/html; charset=utf-8'),
  });
});
