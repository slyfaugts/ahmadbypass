// api/upload.js — Proxy + limit checker
export const config = { api: { bodyParser: false, maxDuration: 60 } };

const FREE_DAILY_LIMIT = 5;

async function getUser(uid) {
  const r = await fetch(`${process.env.FIREBASE_DB_URL}/users/${uid}.json?auth=${process.env.FIREBASE_SECRET}`);
  return r.json();
}
async function patchUser(uid, data) {
  await fetch(`${process.env.FIREBASE_DB_URL}/users/${uid}.json?auth=${process.env.FIREBASE_SECRET}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = req.headers['x-roblox-api-key'];
  if (!apiKey) return res.status(400).json({ error: 'Missing Roblox API key' });

  // ── Auth check ──
  const sessionToken = req.headers['x-session-token'];
  let user = null;
  if (sessionToken) {
    try {
      const s = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
      if (Date.now() - s.ts < 7 * 24 * 60 * 60 * 1000) {
        user = await getUser(s.uid);
      }
    } catch { /* invalid token, treat as guest */ }
  }

  // ── Limit check (only for logged-in free users) ──
  if (user && !user.isAdmin && user.tier !== 'premium') {
    const today = new Date().toISOString().slice(0, 10);
    const sameDay = user.lastUploadDate === today;
    const count = sameDay ? (user.uploadCount || 0) : 0;

    if (count >= FREE_DAILY_LIMIT) {
      return res.status(429).json({
        error: 'LIMIT_REACHED',
        message: `Limit harian ${FREE_DAILY_LIMIT} upload/hari tercapai. Upgrade ke Premium untuk unlimited!`,
        count, limit: FREE_DAILY_LIMIT, resetAt: 'Midnight WIB'
      });
    }

    // Increment counter
    await patchUser(user.id, { uploadCount: count + 1, lastUploadDate: today });
  }

  // ── Operation status polling ──
  if (req.headers['x-check-op']) {
    const opId = req.query.op || '';
    try {
      const r = await fetch(`https://apis.roblox.com/assets/v1/${opId}`, {
        headers: { 'x-api-key': apiKey }
      });
      const text = await r.text();
      if (!text?.trim()) return res.status(200).json({ done: false, status: 'empty_response' });
      try { return res.status(r.status).json(JSON.parse(text)); }
      catch { return res.status(r.status).json({ raw: text }); }
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // ── Upload proxy ──
  try {
    const chunks = [];
    let totalSize = 0;
    const MAX = 20 * 1024 * 1024;
    for await (const chunk of req) {
      totalSize += chunk.length;
      if (totalSize > MAX) return res.status(413).json({ error: 'File terlalu besar (max 20MB)' });
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    const r = await fetch('https://apis.roblox.com/assets/v1/assets', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': req.headers['content-type'] },
      body,
    });
    const text = await r.text();
    if (!text?.trim()) {
      if (r.status >= 200 && r.status < 300) return res.status(200).json({ success: true, operationId: '' });
      return res.status(r.status).json({ error: 'Empty response', status: r.status });
    }
    try { return res.status(r.status).json(JSON.parse(text)); }
    catch { return res.status(r.status).json({ message: text, status: r.status }); }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
