// netlify/functions/analyze.js
// This runs on Netlify's servers — the API key is NEVER sent to the browser.

exports.handler = async function (event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // ── Access token guard ─────────────────────────────────────────────────────
  // The token is set as a Netlify environment variable: ACCESS_TOKEN
  // HR gets the link:  https://your-site.netlify.app/?token=YOUR_TOKEN
  const VALID_TOKEN = process.env.ACCESS_TOKEN;

  if (VALID_TOKEN) {
    let providedToken = null;

    // Accept token from query string OR request body
    try {
      const params = new URLSearchParams(event.rawQuery || '');
      providedToken = params.get('token');
    } catch (_) {}

    if (!providedToken) {
      try {
        const body = JSON.parse(event.body || '{}');
        providedToken = body.token;
      } catch (_) {}
    }

    if (providedToken !== VALID_TOKEN) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Access denied. Invalid or missing token.' })
      };
    }
  }

  // ── Parse request body ─────────────────────────────────────────────────────
  let jd, resume;
  try {
    const body = JSON.parse(event.body || '{}');
    jd     = (body.jd     || '').trim();
    resume = (body.resume || '').trim();
  } catch (_) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body.' }) };
  }

  if (!jd || !resume) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Both jd and resume fields are required.' })
    };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server misconfiguration: ANTHROPIC_API_KEY not set.' })
    };
  }

  // ── Call Claude API ────────────────────────────────────────────────────────
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       process.env.ANTHROPIC_API_KEY,  // <-- stays on server, never exposed
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1800,
        system: `You are an expert ATS resume analyzer and senior career coach.
Analyze the resume against the job description and return ONLY valid JSON — no markdown, no backticks, no preamble.
Use exactly this structure:
{
  "score": <integer 0-100>,
  "scoreLabel": "<2-4 word verdict>",
  "scoreDesc": "<1-2 honest sentences>",
  "matched": ["<keyword in both JD and resume>"],
  "missing": ["<important JD keyword absent from resume>"],
  "strengths": [{"label":"<area>","pct":<0-100>}, ...],
  "actions": ["<specific action item>", ...],
  "rewrites": ["<stronger rewritten bullet point>", ...],
  "impression": "<3-4 sentence recruiter first impression>"
}`,
        messages: [{
          role: 'user',
          content: `JOB DESCRIPTION:\n${jd}\n\n---\n\nRESUME:\n${resume}`
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: `AI service error: ${response.status}` })
      };
    }

    const data = await response.json();
    const rawText = data.content[0].text.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (_) {
      // Fallback: try to extract JSON from within the response
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('AI returned malformed response');
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    };

  } catch (error) {
    console.error('Function error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
