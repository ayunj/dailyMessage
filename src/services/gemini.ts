import { env } from '../config/env.js';

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
};

const PROMPT_JA_DAILY = `
너는 귀엽고 친절한 일본어 튜터다.
한국인을 위해 오늘의 일본어 단어 1개를 알려준다.

출력은 반드시 아래 형식을 지켜라. (한 글자도 바꾸지 말 것)

🌸 오늘의 일본어 🌸

단어(한자):
읽기(히라가나):
뜻(한글+한자): (예: 먹다 (食べる))

🍡 예문
예문:
읽기(히라가나):
뜻(한글+한자): (예: 밥을 먹다 (ご飯を食べる))

✨ 한마디:
(짧은 응원 한 줄)

조건:
- JLPT N4 수준
- 실생활 단어
- 한자 포함 필수
- 뜻에는 일본어 원문 포함
- 형식 절대 변경 금지
`.trim();

function pickText(data: GeminiGenerateResponse): string | null {
  const c0 = data.candidates?.[0];
  const parts = c0?.content?.parts;
  const text = parts?.map((p) => p.text ?? '').join('\n').trim();
  return text ? text : null;
}

export async function generateDailyJapanese(): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(
    env.GEMINI_MODEL
  )}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT_JA_DAILY }] }],
    }),
  });

  const data = (await resp.json()) as GeminiGenerateResponse;
  const text = pickText(data);
  if (text) return text;

  const msg = data.error?.message ?? `Gemini response missing text (status=${resp.status})`;
  throw new Error(msg);
}

