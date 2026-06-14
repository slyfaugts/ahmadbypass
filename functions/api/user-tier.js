// functions/api/user-tier.js
// Cloudflare Pages Function — Get user tier from Firebase Realtime Database

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const discordId = url.searchParams.get('discordId');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (!discordId) {
    return new Response(JSON.stringify({ tier: 'free', credits: 0, expire: null }), {
      headers: corsHeaders
    });
  }

  const FIREBASE_URL   = env.FIREBASE_DATABASE_URL;
  const FIREBASE_TOKEN = env.FIREBASE_TOKEN;

  try {
    const fbRes = await fetch(`${FIREBASE_URL}/users.json?auth=${FIREBASE_TOKEN}`);
    if (!fbRes.ok) throw new Error('Firebase error: ' + fbRes.status);

    const users = await fbRes.json();
    if (!users) {
      return new Response(JSON.stringify({ tier: 'free', credits: 0, expire: null }), {
        headers: corsHeaders
      });
    }

    // Find user by Discord ID
    const match = Object.values(users).find(u => u.id_dc === discordId);
    if (!match) {
      return new Response(JSON.stringify({ tier: 'free', credits: 0, expire: null }), {
        headers: corsHeaders
      });
    }

    // Check expiry for timed tiers
    let tier = match.tier || 'free';
    if ((tier === 'weekly' || tier === 'monthly') && match.expire) {
      if (new Date(match.expire) < new Date()) {
        tier = 'member'; // expired → downgrade
      }
    }

    return new Response(JSON.stringify({
      tier,
      credits: match.credits || 0,
      expire:  match.expire  || null,
      note:    match.note    || '',
    }), { headers: corsHeaders });

  } catch (e) {
    console.error('user-tier error:', e.message);
    return new Response(JSON.stringify({ tier: 'free', credits: 0, expire: null }), {
      headers: corsHeaders
    });
  }
}
