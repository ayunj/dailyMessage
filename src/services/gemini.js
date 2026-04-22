const fetch = require('node-fetch');

function getGeminiEndpoint() {
  const apiVersion = process.env.GEMINI_API_VERSION || 'v1beta';
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  return `https://generativelanguage.googleapis.com/${apiVersion}/models/${encodeURIComponent(
    model
  )}:generateContent`;
}

async function generateContent({ apiKey, promptText }) {
  const endpoint = getGeminiEndpoint();
  const resp = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey || '')}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: promptText }]
        }
      ]
    })
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Gemini API HTTP ${resp.status} ${resp.statusText}: ${errText}`);
  }

  const data = await resp.json();
  // 추가 요구사항: console.log로 Gemini 응답 출력
  console.log('Gemini raw response:', JSON.stringify(data, null, 2));

  return data;
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

