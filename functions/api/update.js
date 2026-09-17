// Cloudflare Pages Function: POST /api/update
//
// Body: { "password": string, "state": object }
// Checks the executive password against an environment secret, then
// writes the new state into KV under the "gmhl-data" key.
//
// Like state.js, this auto-detects whatever KV namespace is bound to
// this Function (by duck-typing .get/.put methods) instead of
// requiring one exact variable name.

const KV_KEY = 'gmhl-data';

function findKVBinding(env) {
  for (const key of Object.keys(env || {})) {
    const val = env[key];
    if (val && typeof val.get === 'function' && typeof val.put === 'function') {
      return val;
    }
  }
  return null;
}

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

    const kv = findKVBinding(env);
    if (!kv) {
      return new Response('ERROR: No KV namespace binding found on this Function. Go to Settings -> Functions -> KV namespace bindings and make sure at least one KV namespace is bound (any variable name works now).', { status: 500 });
    }

    await kv.put(KV_KEY, JSON.stringify(state));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response('ERROR: ' + (err && err.message ? err.message : String(err)), { status: 500 });
  }
}
