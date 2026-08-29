export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const required = ['fullName','email','phone','location','criteria','subject','experience','about','teachingWindow'];
    for (const key of required) if (!body[key]) return res.status(400).json({ error: `Missing field: ${key}` });

    if (!Array.isArray(body.criteria) || body.criteria.length < 1 || body.criteria.length > 2 || body.criteria.some(v => !['WAEC','JAMB'].includes(v))) {
      return res.status(400).json({ error: 'Select WAEC, JAMB, or both.' });
    }
    const expected = body.criteria.length === 2 ? '7:00 PM — 11:00 PM' : body.criteria[0] === 'WAEC' ? '7:00 PM — 9:00 PM' : '9:00 PM — 11:00 PM';
    if (body.teachingWindow !== expected) return res.status(400).json({ error: 'Invalid teaching window.' });
    if (String(body.about).trim().length < 30) return res.status(400).json({ error: 'Teaching information is too short.' });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://letakjckpnpdiqwiuohc.supabase.co';
    // Accept either common public-key variable name. Never use a service-role key here.
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!key) return res.status(500).json({ error: 'Supabase public key is not configured in Vercel.' });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch(`${url}/rest/v1/rpc/submit_tutor_recruitment_application`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          p_full_name: String(body.fullName).trim(),
          p_email: String(body.email).trim().toLowerCase(),
          p_phone: String(body.phone).trim(),
          p_location: String(body.location).trim(),
          p_criteria: body.criteria,
          p_subject: String(body.subject).trim(),
          p_experience: String(body.experience).trim(),
          p_about: String(body.about).trim(),
          p_teaching_window: expected
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const text = await response.text();
    if (!response.ok) {
      let detail = text;
      try { detail = JSON.parse(text)?.message || JSON.parse(text)?.hint || JSON.parse(text)?.details || text; } catch (_) {}
      return res.status(502).json({ error: 'Database submission failed.', detail });
    }

    let id = null;
    try { id = text ? JSON.parse(text) : null; } catch (_) { id = text || null; }
    return res.status(200).json({ success: true, id });
  } catch (error) {
    console.error('Tutor recruitment submission error:', error);
    if (error?.name === 'AbortError') return res.status(504).json({ error: 'The database took too long to respond. Please try again.' });
    return res.status(500).json({ error: error?.message || 'Unexpected submission error.' });
  }
}
