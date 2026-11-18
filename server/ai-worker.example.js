/**
 * Example AI backend for Greeting Card Studio's message writer.
 *
 * This is a Cloudflare Worker, but any small HTTPS endpoint works. It keeps
 * your API key on the server – the app only ever talks to this endpoint.
 *
 * Deploy:
 *   1. npm create cloudflare@latest card-writer   (choose "Hello World" worker)
 *   2. Replace the worker source with this file.
 *   3. npx wrangler secret put ANTHROPIC_API_KEY
 *   4. Set AI_MODEL (a current model id from your AI provider's docs) and
 *      ALLOWED_ORIGIN (e.g. https://your-name.github.io) under [vars] in wrangler.toml.
 *   5. npx wrangler deploy, then paste the worker URL into Settings → AI message writer.
 *
 * Contract:  POST { recipient, occasion, relationship, tone, length, details, sender }
 *            → 200 { "messages": ["…", "…", "…"] }
 */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });
    if (!env.ANTHROPIC_API_KEY || !env.AI_MODEL) return Response.json({ error: 'Server is not configured.' }, { status: 500, headers: cors });

    let brief;
    try { brief = await request.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400, headers: cors }); }
    const clip = (v, n) => String(v ?? '').slice(0, n);
    const words = { short: 'about 25 words', medium: 'about 50 words', long: 'about 90 words' }[brief.length] || 'about 50 words';

    const prompt = [
      'Write three different greeting card messages as a JSON array of three strings and nothing else.',
      `Occasion: ${clip(brief.occasion, 60)}`,
      `Recipient: ${clip(brief.recipient, 60) || 'not given'} (the sender's ${clip(brief.relationship, 40) || 'friend'})`,
      `Tone: ${clip(brief.tone, 30)}. Length: ${words} each.`,
      brief.details ? `Work in this personal detail naturally: ${clip(brief.details, 200)}` : '',
      `Start with a greeting line, then a blank line, the message, a blank line, then a sign-off${brief.sender ? ` followed by the name ${clip(brief.sender, 60)}` : ''}.`,
      'Use Australian English spelling. Be sincere and specific; avoid clichés.',
    ].filter(Boolean).join('\n');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: env.AI_MODEL, max_tokens: 900, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) return Response.json({ error: 'The AI service returned an error.' }, { status: 502, headers: cors });

    const data = await res.json();
    const text = (data.content || []).map((part) => part.text || '').join('');
    let messages = [];
    try { messages = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)); } catch { messages = [text]; }
    messages = messages.filter((m) => typeof m === 'string' && m.trim()).slice(0, 3);
    return Response.json({ messages }, { headers: cors });
  },
};
