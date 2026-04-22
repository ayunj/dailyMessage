const { GEMINI_API_KEY, TELEGRAM_TOKEN, CHAT_ID } = require('../config');
const { generateContent, extractTextOrFail } = require('../services/gemini');
const { sendMessage } = require('../services/telegram');
const { getLanguage } = require('../languages');

function envReport() {
  return [
    '환경 변수가 누락되었습니다.',
    `- TELEGRAM_TOKEN: ${TELEGRAM_TOKEN ? 'OK' : 'MISSING'}`,
    `- CHAT_ID: ${CHAT_ID ? 'OK' : 'MISSING'}`,
    `- GEMINI_API_KEY: ${GEMINI_API_KEY ? 'OK' : 'MISSING'}`
  ].join('\n');
}

async function helloHttp(req, res) {
  res.set('content-type', 'text/plain; charset=utf-8');

  try {
    if (!TELEGRAM_TOKEN || !CHAT_ID || !GEMINI_API_KEY) {
      res.status(500).send(envReport());
      return;
    }

    // 확장 포인트: ?lang=ja|en|zh
    const langCode = typeof req?.query?.lang === 'string' ? req.query.lang : 'ja';
    const lang = getLanguage(langCode);

    let aiText = 'AI 응답 실패 😭';
    try {
      const data = await generateContent({
        apiKey: GEMINI_API_KEY,
        promptText: lang.buildPrompt()
      });
      aiText = extractTextOrFail(data);
    } catch (err) {
      // 에러 처리: Gemini API 실패 시 로그 출력
      console.log('Gemini API 실패:', err);
      aiText = 'AI 응답 실패 😭';
    }

    const finalMessage = lang.wrapFinalMessage(aiText);

    try {
      const tgResp = await sendMessage({
        token: TELEGRAM_TOKEN,
        chatId: CHAT_ID,
        text: finalMessage
      });
      console.log('Telegram response:', JSON.stringify(tgResp, null, 2));
    } catch (err) {
      // 에러 처리: Telegram 실패 시 로그 출력
      console.log('Telegram 전송 실패:', err);
    }

    res.status(200).send(finalMessage);
  } catch (err) {
    console.log('전체 처리 실패:', err);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
}

module.exports = {
  helloHttp
};

