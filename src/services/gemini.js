const fetch = require('node-fetch');

function buildEndpoint({ apiVersion, model }) {
  return `https://generativelanguage.googleapis.com/${apiVersion}/models/${encodeURIComponent(
    model
  )}:generateContent`;
}

function getCandidateApiVersions() {
  const env = process.env.GEMINI_API_VERSION;
  if (env && typeof env === 'string' && env.trim()) return [env.trim()];
  // Default to v1beta; fall back to v1 if needed.
  return ['v1beta', 'v1'];
}

function getCandidateModels() {
  const env = process.env.GEMINI_MODEL;
  if (env && typeof env === 'string' && env.trim()) return [env.trim()];

  // Try a small set of commonly-available model ids across accounts.
  // If none work, we'll log available models via ListModels.
  return [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest'
  ];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientError(status, errText) {
  if (status === 503 || status === 429) return true;
  const lower = (errText || '').toLowerCase();
  return (
    lower.includes('high demand') ||
    lower.includes('resource exhausted') ||
    lower.includes('overloaded')
  );
}

async function listModels({ apiKey, apiVersion }) {
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models?key=${encodeURIComponent(
    apiKey || ''
  )}`;
  const resp = await fetch(url, { method: 'GET' });
  const text = await resp.text().catch(() => '');
  if (!resp.ok) return { ok: false, status: resp.status, statusText: resp.statusText, text };
  try {
    return { ok: true, json: JSON.parse(text) };
  } catch {
    return { ok: true, json: { raw: text } };
  }
}

async function generateContent({ apiKey, promptText }) {
  const apiVersions = getCandidateApiVersions();
  const models = getCandidateModels();

  const body = JSON.stringify({
    contents: [
      {
        parts: [{ text: promptText }]
      }
    ]
  });

  let lastErr = null;
  for (const apiVersion of apiVersions) {
    for (const model of models) {
      const endpoint = buildEndpoint({ apiVersion, model });
      const url = `${endpoint}?key=${encodeURIComponent(apiKey || '')}`;
      const fetchOptions = {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body
      };

      let resp = null;
      let errText = '';
      for (let attempt = 0; attempt < 3; attempt++) {
        resp = await fetch(url, fetchOptions);
        if (resp.ok) break;

        errText = await resp.text().catch(() => '');
        if (!isTransientError(resp.status, errText) || attempt === 2) break;

        const delayMs = 1000 * (attempt + 1);
        console.log(
          'Gemini transient error, retrying:',
          JSON.stringify({ apiVersion, model, status: resp.status, attempt: attempt + 1, delayMs })
        );
        await sleep(delayMs);
      }

      if (resp.ok) {
        const data = await resp.json();
        console.log(
          'Gemini raw response:',
          JSON.stringify(
            {
              apiVersion,
              model,
              data
            },
            null,
            2
          )
        );
        return data;
      }

      const err = new Error(`Gemini API HTTP ${resp.status} ${resp.statusText}: ${errText}`);
      err.status = resp.status;
      err.apiVersion = apiVersion;
      err.model = model;
      lastErr = err;

      // 404: unsupported model. 503/429/high demand: try next model.
      if (resp.status === 404 || isTransientError(resp.status, errText)) continue;
      throw err;
    }

    // We tried all models for this apiVersion. Log available models once to help debug.
    try {
      const lm = await listModels({ apiKey, apiVersion });
      if (lm.ok) {
        const names = Array.isArray(lm.json?.models)
          ? lm.json.models.map((m) => m?.name).filter(Boolean)
          : [];
        console.log('Gemini ListModels:', JSON.stringify({ apiVersion, names: names.slice(0, 50) }, null, 2));
      } else {
        console.log(
          'Gemini ListModels failed:',
          JSON.stringify(
            { apiVersion, status: lm.status, statusText: lm.statusText, text: lm.text?.slice(0, 2000) },
            null,
            2
          )
        );
      }
    } catch (e) {
      console.log('Gemini ListModels exception:', e);
    }
  }

  throw lastErr || new Error('Gemini API failed');
}

function extractTextOrFail(data) {
  const candidates = Array.isArray(data?.candidates) ? data.candidates : null;
  if (!candidates || candidates.length === 0) return 'AI 응답 실패 😭';

  const parts = candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return 'AI 응답 실패 😭';

  const text = parts
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .filter(Boolean)
    .join('\n');

  return text || 'AI 응답 실패 😭';
}

module.exports = {
  generateContent,
  extractTextOrFail
};

