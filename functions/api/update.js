// Cloudflare Pages Function: POST /api/update
//
// Body: { "password": string, "state": object }
// Checks the executive password against an environment secret, then
// writes the new state into KV under the "gmhl-data" key.
//
// Wrapped in try/catch so any unexpected failure (bad binding, KV
// write error, etc.) comes back as a readable message instead of an
// opaque platform 500 with no explanation.

const KV_KEY = 'gmhl-data';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    let payload;
    try {
      payload = await request.json();
    } catch (err) {
      return new Response('ERROR: Invalid JSON body sent to /api/update.', { status: 400 });
    }

    const password = payload && payload.password;
    const state = payload && payload.state;

    const expected = env.ADMIN_PASSWORD;
    if (!expected) {
      return new Response('ERROR: ADMIN_PASSWORD environment variable is not set on this deployment.', { status: 500 });
    }
    if (String(password || '').trim() !== String(expected).trim()) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (!state || typeof state !== 'object' || !Array.isArray(state.schedule)) {
      return new Response('ERROR: Invalid state payload (missing or malformed "schedule" array).', { status: 400 });
    }

    if (!env.GMHL_STATE) {
      return new Response('ERROR: KV namespace not bound to GMHL_STATE. Check Settings -> Functions -> KV namespace bindings.', { status: 500 });
    }
    if (typeof env.GMHL_STATE.put !== 'function') {
      return new Response('ERROR: GMHL_STATE is bound but is not a KV namespace (wrong binding type).', { status: 500 });
    }

    await env.GMHL_STATE.put(KV_KEY, JSON.stringify(state));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response('ERROR: ' + (err && err.message ? err.message : String(err)), { status: 500 });
  }
}
