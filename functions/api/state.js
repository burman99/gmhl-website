// Cloudflare Pages Function: GET /api/state
//
// Serves the live league data out of KV. If nothing is found under the
// expected key, returns 404 — the site's front-end already falls back
// to its own built-in season data whenever this endpoint doesn't
// respond with 200, so that's safe.
//
// Wrapped in try/catch so any unexpected failure (bad binding, KV
// outage, etc.) comes back as a readable message instead of an opaque
// platform 500.

const KV_KEY = 'gmhl-data';

export async function onRequestGet(context) {
  try {
    const { env } = context;

    if (!env.GMHL_STATE) {
      return new Response('ERROR: KV namespace not bound to GMHL_STATE. Check Settings -> Functions -> KV namespace bindings.', { status: 500 });
    }
    if (typeof env.GMHL_STATE.get !== 'function') {
      return new Response('ERROR: GMHL_STATE is bound but is not a KV namespace (wrong binding type).', { status: 500 });
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
  } catch (err) {
    return new Response('ERROR: ' + (err && err.message ? err.message : String(err)), { status: 500 });
  }
}
