// Cloudflare Pages Function: GET /api/state
//
// Serves the live league data. Since we can't be 100% sure what the KV
// binding is actually named (or, it turns out, what type of binding it
// really is), this tries the real get() call against every object-like
// binding on the environment and uses whichever one actually behaves
// like a KV namespace (returns a string or null, doesn't throw).
//
// If nothing usable is found, returns 500 with details on what was
// tried. If a usable KV binding is found but has nothing stored yet,
// returns 404 — the site's front-end already falls back to its own
// built-in season data whenever this endpoint doesn't respond with
// 200, so that's safe.

const KV_KEY = 'gmhl-data';

async function kvGet(env, key) {
  const attempts = [];
  for (const name of Object.keys(env || {})) {
    const val = env[name];
    if (!val || typeof val !== 'object' || typeof val.get !== 'function') continue;
    try {
      const result = await val.get(key);
      if (result === null || typeof result === 'string') {
        return { ok: true, value: result, binding: name };
      }
      attempts.push(name + ': returned a non-string, non-null value (wrong binding type)');
    } catch (err) {
      attempts.push(name + ': ' + (err && err.message ? err.message : String(err)));
    }
  }
  return { ok: false, attempts };
}

export async function onRequestGet(context) {
  try {
    const { env } = context;
    const result = await kvGet(env, KV_KEY);

    if (!result.ok) {
      return new Response(
        'ERROR: No working KV namespace binding found.\nTried:\n' + (result.attempts.join('\n') || '(no object-like bindings on this environment at all)'),
        { status: 500 }
      );
    }
    if (result.value === null) {
      return new Response('Not found', { status: 404 });
    }

    return new Response(result.value, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    return new Response('ERROR: ' + (err && err.message ? err.message : String(err)), { status: 500 });
  }
}
