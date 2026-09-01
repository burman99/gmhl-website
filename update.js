export async function onRequestPost({ request, env }) {
  const json = (obj, status) =>
    new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: { "content-type": "application/json" },
    });

  if (!env.ADMIN_PASSWORD) {
    return json({ error: "Server isn't configured yet — set the ADMIN_PASSWORD variable in Cloudflare Pages settings." }, 500);
  }
  if (!env.GMHL_KV) {
    return json({ error: "Server isn't configured yet — bind a KV namespace named GMHL_KV in Cloudflare Pages settings." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "Bad request body." }, 400);
  }

  const password = body && body.password;
  if (typeof password !== "string" || password !== env.ADMIN_PASSWORD) {
    return json({ error: "Wrong password." }, 401);
  }

  const state = body && body.state;
  if (
    !state ||
    typeof state !== "object" ||
    !Array.isArray(state.schedule) ||
    !Array.isArray(state.teams)
  ) {
    return json({ error: "That doesn't look like valid league data." }, 400);
  }

  await env.GMHL_KV.put("state", JSON.stringify(state));
  return json({ ok: true });
}
