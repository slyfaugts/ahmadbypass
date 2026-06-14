// functions/api/discord-callback.js
// Cloudflare Pages Function — Discord OAuth2 callback

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  const CLIENT_ID     = env.DISCORD_CLIENT_ID;
  const CLIENT_SECRET = env.DISCORD_CLIENT_SECRET;
  const REDIRECT_URI  = env.DISCORD_REDIRECT_URI;
  const GUILD_ID      = env.DISCORD_GUILD_ID;

  if (!code) {
    return new Response(JSON.stringify({ error: 'No code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const htmlResponse = (body) => new Response(body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });

  try {
    // 1. Exchange code → access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
      }),
    });
    const token = await tokenRes.json();
    if (!token.access_token) throw new Error('Token failed: ' + JSON.stringify(token));

    // 2. Get user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const user = await userRes.json();

    // 3. Check guild membership
    let isMember = false;
    try {
      const memberRes = await fetch(
        `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
        { headers: { Authorization: `Bearer ${token.access_token}` } }
      );
      isMember = memberRes.ok;
    } catch (_) {}

    const userData = {
      id:          user.id,
      username:    user.username,
      global_name: user.global_name || user.username,
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) % 5n)}.png`,
      isMember,
    };

    return htmlResponse(`<!DOCTYPE html><html><body><script>
      window.opener && window.opener.postMessage(
        ${JSON.stringify({ type: 'DISCORD_LOGIN', user: userData })}, '*'
      );
      window.close();
    <\/script><p>Login berhasil! Menutup jendela...</p></body></html>`);

  } catch (e) {
    return htmlResponse(`<!DOCTYPE html><html><body><script>
      window.opener && window.opener.postMessage(
        ${JSON.stringify({ type: 'DISCORD_ERROR', error: e.message })}, '*'
      );
      window.close();
    <\/script><p>Login gagal.</p></body></html>`);
  }
}
