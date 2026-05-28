export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = req.headers['x-roblox-api-key'];
  if (!apiKey) return res.status(400).json({ error: 'Missing API key' });

  // Operation status check
  if (req.headers['x-check-op']) {
    const opId = req.query.op || '';
    try {
      const r = await fetch(`https://apis.roblox.com/assets/v1/${opId}`, {
        headers: { 'x-api-key': apiKey }
      });
      const t = await r.text();
      return res.status(r.status).json(JSON.parse(t));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Normal upload
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const r = await fetch('https://apis.roblox.com/assets/v1/assets', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': req.headers['content-type'] },
      body,
    });
    const t = await r.text();
    try { res.status(r.status).json(JSON.parse(t)); }
    catch { res.status(r.status).send(t); }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
