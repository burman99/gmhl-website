// Cloudflare Pages Function: POST /api/update
//
// Body: { "password": string, "state": object }
// Checks the executive password against an environment secret, then
// writes the new state under the "gmhl-data" key.
//
// Like state.js, this tries the real put() call against every
// object-like binding on the environment and uses whichever one
// actually succeeds, rather than assuming a specific variable name or
// binding type.

const KV_KEY = 'gmhl-data';

async function kvPut(env, key, value) {
  const attempts = [];
  for (const name of Object.keys(env || {})) {
    const val = env[name];
    if (!val || typeof val !== 'object' || typeof val.put !== 'function') continue;
    try {
      await val.put(key, value);
      return { ok: true, binding: name };
    } catch (err) {
      attempts.push(name + ': ' + (err && err.message ? err.message : String(err)));
    }
  }
  return { ok: false, attempts };
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

    const result = await kvPut(env, KV_KEY, JSON.stringify(state));
    if (!result.ok) {
      return new Response(
        'ERROR: No working KV namespace binding found.\nTried:\n' + (result.attempts.join('\n') || '(no object-like bindings on this environment at all)'),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ ok: true, binding: result.binding }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response('ERROR: ' + (err && err.message ? err.message : String(err)), { status: 500 });
  }
}
