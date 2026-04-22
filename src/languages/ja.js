function buildJapanesePrompt(options = {}) {
  const recentWords = Array.isArray(options?.excludeWords) ? options.excludeWords : [];
  const excludeBlock =
    recentWords.length > 0
      ? [
          '',
          '추가 조건:',
          `- 최근에 이미 보낸 단어는 제외하고, 아래 목록에 없는 단어로 골라.`,
          `- 제외 목록: ${recentWords.join(', ')}`
        ].join('\n')
      : '';

  return [
    '너는 귀엽고 이해 잘 시켜주는 일본어 튜터야.',
    'JLPT N4 수준의 실생활 단어 1개를 골라서 아래 출력 형식을 "그대로" 지켜서 작성해.',
    '형식/이모지/줄바꿈/라벨 문구를 절대 바꾸지 마.',
    '',
    '출력 형식:',
    '💌 오늘도 일본어 도착!',
    '',
    '🌸 오늘의 단어 🌸',
    '단어(한자+히라가나 같이):',
    '👉 뜻(한글+한자):',
    '',
    '🧠 이렇게 외워요!',
    '(단어를 쪼개서 쉽게 설명)',
    '',
    '🍡 예문',
    '예문:',
    '（히라가나 읽기）',
    '👉 뜻(한글 자연스럽게)',
    '',
    '✨ 포인트',
    '(문법 또는 표현 한 줄 설명)',
    '',
    '💡 한마디',
    '(짧은 응원 한 줄)',
    '',
    '조건:',
    '- 너무 어렵지 않게',
    '- 설명은 최대한 쉽게',
    '- 한자 포함 필수',
    '- 반드시 위 형식 유지'
  ].join('\n') + excludeBlock;
}

function wrapFinalMessage(aiText) {
  return `💌 오늘도 일본어 도착했어요!\n\n${aiText}`;
}

module.exports = {
  buildPrompt: buildJapanesePrompt,
  wrapFinalMessage
};

