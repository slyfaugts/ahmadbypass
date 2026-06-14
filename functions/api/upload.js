// functions/api/upload.js
// Cloudflare Pages Function — Proxy upload ke Roblox Assets API

export async function onRequest(context) {
  const { request } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const apiKey = request.headers.get('x-roblox-api-key');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API key' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);

  // Operation status polling
  if (request.headers.get('x-check-op')) {
    const opId = url.searchParams.get('op') || '';
    try {
      const r = await fetch(`https://apis.roblox.com/assets/v1/${opId}`, {
        headers: { 'x-api-key': apiKey }
      });
      const text = await r.text();
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ done: false, status: 'empty_response' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      try {
        return new Response(text, {
          status: r.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch {
        return new Response(JSON.stringify({ raw: text }), {
          status: r.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Upload ke Roblox
  try {
    const body = await request.arrayBuffer();
    const contentType = request.headers.get('content-type') || '';

    const r = await fetch('https://apis.roblox.com/assets/v1/assets', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': contentType,
      },
      body,
    });

    const text = await r.text();

    if (!text || text.trim() === '') {
      if (r.status >= 200 && r.status < 300) {
        return new Response(JSON.stringify({ success: true, operationId: '', message: 'Upload accepted' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'Empty response', status: r.status }), {
        status: r.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return JSON or raw text
    try {
      JSON.parse(text); // validate JSON
      return new Response(text, {
        status: r.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch {
      return new Response(JSON.stringify({ message: text, status: r.status }), {
        status: r.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
