// api/admin.js — Admin panel: konfirmasi premium, lihat users, set limit
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verify admin token
  const token = req.headers['x-admin-token'];
  if (!token) return res.status(401).json({ error: 'No token' });

  let session;
  try {
    session = JSON.parse(Buffer.from(token, 'base64').toString());
    if (Date.now() - session.ts > 7 * 24 * 60 * 60 * 1000) return res.status(401).json({ error: 'Expired' });
    if (!session.isAdmin) return res.status(403).json({ error: 'Not admin' });
  } catch { return res.status(401).json({ error: 'Invalid token' }); }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
  const { action, userId } = { ...req.query, ...body };
  const FB = process.env.FIREBASE_DB_URL;
  const SECRET = process.env.FIREBASE_SECRET;

  // ── List all users ──
  if (action === 'list') {
    const data = await fetch(`${FB}/users.json?auth=${SECRET}`).then(r => r.json());
    const users = data ? Object.values(data) : [];
    return res.status(200).json({ users });
  }

  // ── Upgrade user to premium ──
  if (action === 'upgrade' && userId) {
    await fetch(`${FB}/users/${userId}.json?auth=${SECRET}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: 'premium', upgradedAt: new Date().toISOString(), upgradedBy: session.uid }),
    });
    return res.status(200).json({ ok: true, message: `User ${userId} upgraded to premium` });
  }

  // ── Downgrade user to free ──
  if (action === 'downgrade' && userId) {
    await fetch(`${FB}/users/${userId}.json?auth=${SECRET}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: 'free', downgradedAt: new Date().toISOString() }),
    });
    return res.status(200).json({ ok: true });
  }

  // ── Reset daily count for a user ──
  if (action === 'reset' && userId) {
    await fetch(`${FB}/users/${userId}.json?auth=${SECRET}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadCount: 0, lastUploadDate: '' }),
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
