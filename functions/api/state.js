// Cloudflare Pages Function: GET /api/state
//
// Serves the live league data out of KV. If nothing is found under the
// expected key, returns 404 — the site's front-end already falls back
// to its own built-in season data whenever this endpoint doesn't
// respond with 200, so that's safe.
//
// SETUP REQUIRED: bind your existing KV namespace (the one already
// holding the "gmhl-data" key) to this Pages project under the
// variable name GMHL_STATE, in Settings -> Functions -> KV namespace
// bindings.

const KV_KEY = 'gmhl-data';

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.GMHL_STATE) {
    return new Response('KV namespace not bound (GMHL_STATE)', { status: 500 });
  }

  const stored = await env.GMHL_STATE.get(KV_KEY);
  if (!stored) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(stored, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
