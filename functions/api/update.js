// Cloudflare Pages Function: POST /api/update
//
// Body: { "password": string, "state": object }
// Checks the executive password against an environment secret, then
// writes the new state into the same KV namespace /api/state reads
// from.
//
// SETUP REQUIRED:
//   1. Settings -> Functions -> KV namespace bindings: bind a KV
//      namespace to the variable name GMHL_STATE (same one used by
//      functions/api/state.js).
//   2. Settings -> Environment variables: add a variable named
//      ADMIN_PASSWORD, mark it "Encrypt" (so it's a secret), and set it
//      to whatever password your executives should type into the
//      Executive Tools panel.

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload;
  try {
    payload = await request.json();
  } catch (err) {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const password = payload && payload.password;
  const state = payload && payload.state;

  if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!state || typeof state !== 'object' || !Array.isArray(state.schedule)) {
    return new Response('Invalid state payload', { status: 400 });
  }

  if (!env.GMHL_STATE) {
    return new Response('KV namespace not bound (GMHL_STATE)', { status: 500 });
  }

  await env.GMHL_STATE.put('state', JSON.stringify(state));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
