// Cloudflare Pages Function: GET /api/state
//
// Serves the live league data out of KV. Rather than requiring the KV
// binding to have one specific variable name, this scans the Function's
// environment for whatever is bound that looks like a KV namespace
// (has .get and .put methods) and uses that — so it doesn't matter
// what you named the binding in the dashboard.
//
// If nothing is found under the expected key, returns 404 — the site's
// front-end already falls back to its own built-in season data
// whenever this endpoint doesn't respond with 200, so that's safe.

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

export async function onRequestGet(context) {
  try {
    const { env } = context;

    const kv = findKVBinding(env);
    if (!kv) {
      return new Response('ERROR: No KV namespace binding found on this Function. Go to Settings -> Functions -> KV namespace bindings and make sure at least one KV namespace is bound (any variable name works now).', { status: 500 });
    }

    const stored = await kv.get(KV_KEY);
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
