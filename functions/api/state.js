// Cloudflare Pages Function: GET /api/state
//
// Serves the live league data out of KV. If nothing has been published
// yet (fresh KV namespace), returns 404 — the site's front-end already
// falls back to its own built-in season data whenever this endpoint
// doesn't respond with 200, so that's safe.
//
// SETUP REQUIRED: in your Cloudflare Pages project, go to
// Settings -> Functions -> KV namespace bindings, and bind a KV
// namespace to the variable name GMHL_STATE. If you already have a KV
// namespace under a different binding name, either rename the binding
// to GMHL_STATE or update the two `env.GMHL_STATE` references below.

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.GMHL_STATE) {
    return new Response('KV namespace not bound (GMHL_STATE)', { status: 500 });
  }

  const stored = await env.GMHL_STATE.get('state');
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
