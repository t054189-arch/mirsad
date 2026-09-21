// GET /seal-pdf?seal=<id> — the export.
//
// Unlike /verify this returns the record itself, so it stays behind
// authentication (the gateway checks the JWT before this runs). Every sheet it
// produces carries the QR code for the public /verify endpoint.

import { buildReportPdf } from '../_shared/report.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const VERIFY_URL = Deno.env.get('MIRSAD_VERIFY_URL') ?? `${SUPABASE_URL}/functions/v1/verify`;
const FONT_URL = Deno.env.get('MIRSAD_PDF_FONT_URL');

// loaded once per instance; the PDF embeds it so Arabic prints shaped
let fontBytes: Uint8Array | null = null;
async function font(): Promise<Uint8Array> {
  if (fontBytes) return fontBytes;
  try {
    fontBytes = await Deno.readFile(new URL('./DejaVuSans.ttf', import.meta.url));
  } catch {
    if (!FONT_URL) throw new Error('no font: deploy DejaVuSans.ttf beside this function or set MIRSAD_PDF_FONT_URL');
    fontBytes = new Uint8Array(await (await fetch(FONT_URL)).arrayBuffer());
  }
  return fontBytes;
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'GET') {
    return new Response('method not allowed', { status: 405 });
  }

  const seal = new URL(request.url).searchParams.get('seal')?.trim() ?? '';
  if (!/^MRS-[0-9A-F]{16}$/.test(seal)) {
    return new Response('unknown seal', { status: 404 });
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sealed_record_export`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: SERVICE_KEY!,
      authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ p_seal_id: seal }),
  });
  if (!response.ok) return new Response('export failed', { status: 502 });

  const record = await response.json();
  if (!record) return new Response('unknown seal', { status: 404 });

  const pdf = await buildReportPdf(record, `${VERIFY_URL}?seal=${encodeURIComponent(seal)}`, await font());

  return new Response(pdf, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="mirsad-${seal}.pdf"`,
      'cache-control': 'no-store',
    },
  });
});
