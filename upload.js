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

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);

    const robloxRes = await fetch('https://apis.roblox.com/assets/v1/assets', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': req.headers['content-type'],
      },
      body,
    });

    const text = await robloxRes.text();
    try {
      res.status(robloxRes.status).json(JSON.parse(text));
    } catch {
      res.status(robloxRes.status).send(text);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
