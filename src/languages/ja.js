function buildJapanesePrompt() {
  return [
    '너는 귀엽고 친절한 일본어 튜터야.',
    'JLPT N4 수준의 실생활 단어 1개를 골라서 아래 출력 형식을 "그대로" 지켜서 작성해.',
    '형식/이모지/줄바꿈/라벨 문구를 절대 바꾸지 마.',
    '',
    '출력 형식:',
    '🌸 오늘의 일본어 🌸',
    '',
    '단어(한자):',
    '읽기(히라가나):',
    '뜻(한글+한자): (예: 먹다 (食べる))',
    '',
    '🍡 예문',
    '예문:',
    '읽기(히라가나):',
    '뜻(한글+한자): (예: 밥을 먹다 (ご飯を食べる))',
    '',
    '✨ 한마디:',
    '(짧은 응원 한 줄)'
  ].join('\n');
}

function wrapFinalMessage(aiText) {
  return `💌 오늘도 일본어 도착했어요!\n\n${aiText}`;
}

module.exports = {
  buildPrompt: buildJapanesePrompt,
  wrapFinalMessage
};

