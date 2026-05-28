// api/auth.js — Discord OAuth callback + Firebase user sync
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { code, action } = req.query;

  // ── Discord OAuth exchange ──
  if (action === 'discord' && code) {
    try {
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID,
          client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.DISCORD_REDIRECT_URI,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) return res.status(400).json({ error: 'OAuth failed', detail: tokenData });

      // Get Discord user info
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const user = await userRes.json();

      // Upsert user to Firebase via REST
      const fbUrl = `${process.env.FIREBASE_DB_URL}/users/${user.id}.json?auth=${process.env.FIREBASE_SECRET}`;
      const existing = await fetch(fbUrl).then(r => r.json());

      const isAdmin = process.env.ADMIN_DISCORD_IDS?.split(',').includes(user.id);
      const now = new Date().toISOString();

      const userData = {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator || '0',
        avatar: user.avatar,
        email: user.email || '',
        tier: existing?.tier || 'free',
        isAdmin: isAdmin || false,
        createdAt: existing?.createdAt || now,
        lastLogin: now,
        uploadCount: existing?.uploadCount || 0,
        lastUploadDate: existing?.lastUploadDate || '',
      };

      await fetch(fbUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      // Simple session token (in production use JWT)
      const sessionToken = Buffer.from(JSON.stringify({
        uid: user.id, username: user.username, avatar: user.avatar,
        tier: userData.tier, isAdmin: userData.isAdmin, ts: Date.now()
      })).toString('base64');

      // Redirect back to app with token
      return res.redirect(302, `/?token=${encodeURIComponent(sessionToken)}`);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── Verify session token ──
  if (action === 'verify' && req.method === 'POST') {
    try {
      const { token } = req.body || (await readBody(req));
      if (!token) return res.status(400).json({ error: 'No token' });
      const data = JSON.parse(Buffer.from(token, 'base64').toString());
      // Token expires in 7 days
      if (Date.now() - data.ts > 7 * 24 * 60 * 60 * 1000) return res.status(401).json({ error: 'Token expired' });

      // Re-fetch user from Firebase for latest tier/limit info
      const fbUrl = `${process.env.FIREBASE_DB_URL}/users/${data.uid}.json?auth=${process.env.FIREBASE_SECRET}`;
      const user = await fetch(fbUrl).then(r => r.json());
      if (!user) return res.status(404).json({ error: 'User not found' });

      return res.status(200).json({ user });
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  return res.status(400).json({ error: 'Unknown action' });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}
