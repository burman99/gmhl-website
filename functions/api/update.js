// Cloudflare Pages Function: POST /api/update
//
// Body: { "password": string, "state": object }
// Checks the executive password against an environment secret, then
// writes the new state into the same KV namespace /api/state reads
// from, under the "gmhl-data" key.
//
// SETUP REQUIRED:
//   1. Settings -> Functions -> KV namespace bindings: bind your
//      existing KV namespace (the one with "gmhl-data" in it) to the
//      variable name GMHL_STATE.
//   2. Settings -> Environment variables: add ADMIN_PASSWORD as an
//      encrypted/secret variable, set to whatever password executives
//      should type into the Executive Tools panel to publish.

const KV_KEY = 'gmhl-data';

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

  await env.GMHL_STATE.put(KV_KEY, JSON.stringify(state));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
