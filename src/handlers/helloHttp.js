const { GEMINI_API_KEY, TELEGRAM_TOKEN, CHAT_ID } = require('../config');
const { generateContent, extractTextOrFail } = require('../services/gemini');
const { sendMessage } = require('../services/telegram');
const { getLanguage } = require('../languages');
const { getRecentWords, getThisWeekWords, addWord } = require('../services/wordHistory');
const { getWeekdayIndexInTimeZone } = require('../utils/timeZone');
const { extractWordFromAiText } = require('../utils/extractWord');
const { isWordExcluded } = require('../utils/japaneseWord');

const MAX_WORD_GENERATION_ATTEMPTS = 3;

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

    // Cloud Run/Functions default TZ can be UTC. Use IANA timeZone to ensure "토요일" is in KST.
    const timeZone = typeof process.env.TIME_ZONE === 'string' && process.env.TIME_ZONE.trim()
      ? process.env.TIME_ZONE.trim()
      : 'Asia/Seoul';
    const now = new Date();
    const dayOfWeek = getWeekdayIndexInTimeZone(now, timeZone); // 0=Sun ... 6=Sat (in timeZone)
    const isReviewDay = dayOfWeek === 6; // 토요일 (in timeZone)

    const recentWords = await getRecentWords({ langCode, limit: 30 });
    const thisWeekWords = isReviewDay ? await getThisWeekWords({ langCode, limit: 30, now, timeZone }) : [];

    console.log(
      'Run context:',
      JSON.stringify(
        {
          timeZone,
          now: now.toISOString(),
          dayOfWeek,
          isReviewDay,
          recentWordsCount: recentWords.length,
          thisWeekWordsCount: thisWeekWords.length
        },
        null,
        2
      )
    );

    // 복습일(토요일)인데 이번 주 단어가 없으면 Gemini를 거치지 않고 고정 안내만 전송
    if (isReviewDay && thisWeekWords.length === 0) {
      const finalMessage = [
        '💌 주간 일본어 챌린지!',
        '',
        '🧠 이번 주 단어 기억나?',
        '이번 주에는 아직 보낸 단어가 없어서 복습 퀴즈를 만들 수 없어요.',
        '',
        '💡 한마디',
        '다음 주부터 같이 차근차근 쌓아보자!'
      ].join('\n');

      try {
        const tgResp = await sendMessage({
          token: TELEGRAM_TOKEN,
          chatId: CHAT_ID,
          text: finalMessage
        });
        console.log('Telegram response:', JSON.stringify(tgResp, null, 2));
      } catch (err) {
        console.log('Telegram 전송 실패:', err);
      }

      res.status(200).send(finalMessage);
      return;
    }

    let aiText = 'AI 응답 실패 😭';
    let excludeWords = [...recentWords];
    try {
      for (let attempt = 1; attempt <= MAX_WORD_GENERATION_ATTEMPTS; attempt += 1) {
        const data = await generateContent({
          apiKey: GEMINI_API_KEY,
          promptText: lang.buildPrompt({ excludeWords, dayOfWeek, thisWeekWords })
        });
        aiText = extractTextOrFail(data);

        if (isReviewDay) break;

        const candidateWord = extractWordFromAiText(aiText);
        if (!candidateWord || !isWordExcluded(candidateWord, excludeWords)) break;

        console.log(
          '중복 단어 감지, 재생성 시도:',
          JSON.stringify({ attempt, word: candidateWord, excludeCount: excludeWords.length })
        );
        if (!excludeWords.some((w) => w === candidateWord)) {
          excludeWords = [...excludeWords, candidateWord];
        }
        if (attempt === MAX_WORD_GENERATION_ATTEMPTS) {
          console.log('중복 단어 재생성 한도 도달:', JSON.stringify({ word: candidateWord }));
        }
      }
    } catch (err) {
      // 에러 처리: Gemini API 실패 시 로그 출력
      console.log('Gemini API 실패:', err);
      aiText = 'AI 응답 실패 😭';
    }

    const finalMessage = lang.wrapFinalMessage(aiText);

    // Best-effort: extract the "오늘의 단어" line and remember it to reduce repeats next runs.
    if (!isReviewDay) {
      try {
        const word = extractWordFromAiText(aiText);
        if (word) {
          const result = await addWord({ langCode, word, max: 200 });
          console.log('단어 히스토리 저장:', JSON.stringify(result, null, 2));
        } else {
          console.log(
            '단어 추출 실패: 응답에서 단어 라벨을 찾지 못함',
            JSON.stringify({ preview: aiText.slice(0, 500) })
          );
        }
      } catch (e) {
        console.log('단어 히스토리 저장 실패:', e);
      }
    }

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

