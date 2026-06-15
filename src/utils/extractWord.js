function looksLikeJapaneseWord(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return false;
  if (/^\(.+\)$/.test(trimmed)) return false;
  if (/^[🧠🍡✨💡👉🌸]/.test(trimmed)) return false;
  if (/^(예문|뜻|포인트|한마디|이렇게)/.test(trimmed)) return false;
  return /[\u3040-\u30ff\u4e00-\u9fff]/.test(trimmed);
}

function extractWordFromAiText(aiText) {
  if (!aiText || typeof aiText !== 'string') return '';

  const text = aiText.trim();
  if (!text || text === 'AI 응답 실패 😭') return '';
  if (text.startsWith('💌 주간 일본어 챌린지!')) return '';

  const patterns = [
    /^\s*단어\(한자\+히라가나 같이\):\s*(.+?)\s*$/m,
    /^\s*단어:\s*(.+?)\s*$/m,
    /^\s*오늘의\s*단어\s*[:：]\s*(.+?)\s*$/m,
    /🌸\s*오늘의\s*단어\s*🌸[^\n]*\n\s*(.+?)\s*$/m,
    /\*{0,2}\s*🌸\s*오늘의\s*단어\s*🌸\s*\*{0,2}[^\n]*\n\s*(.+?)\s*$/m
  ];

  for (const re of patterns) {
    const match = text.match(re);
    const word = match?.[1] ? String(match[1]).trim() : '';
    if (word && looksLikeJapaneseWord(word)) return word;
  }

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/🌸\s*오늘의\s*단어\s*🌸/.test(lines[i])) continue;
    for (let j = i + 1; j < lines.length && j <= i + 3; j++) {
      const candidate = lines[j].trim();
      if (looksLikeJapaneseWord(candidate)) return candidate;
    }
  }

  return '';
}

module.exports = {
  extractWordFromAiText,
  looksLikeJapaneseWord
};
