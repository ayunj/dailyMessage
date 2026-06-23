function normalizeWordText(word) {
  if (typeof word !== 'string') return '';
  return word
    .trim()
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/\s+/g, '');
}

function parseJapaneseWord(word) {
  const full = normalizeWordText(word);
  if (!full) return { surface: '', reading: '', full: '' };

  const parenMatch = full.match(/^(.+?)\(([^)]+)\)$/);
  if (parenMatch) {
    return {
      surface: parenMatch[1].trim(),
      reading: parenMatch[2].trim(),
      full
    };
  }

  if (/^[\u3040-\u30ff]+$/.test(full)) {
    return { surface: '', reading: full, full };
  }

  return { surface: full, reading: '', full };
}

function isSameJapaneseWord(a, b) {
  const pa = parseJapaneseWord(a);
  const pb = parseJapaneseWord(b);
  if (!pa.full || !pb.full) return false;
  if (pa.full === pb.full) return true;
  if (pa.surface && pb.surface && pa.surface === pb.surface) return true;
  if (pa.reading && pb.reading && pa.reading === pb.reading) return true;
  if (pa.surface && pa.surface === pb.full) return true;
  if (pb.surface && pb.surface === pa.full) return true;
  if (pa.reading && pa.reading === pb.full) return true;
  if (pb.reading && pb.reading === pa.full) return true;
  return false;
}

function isWordExcluded(word, excludeWords) {
  if (!word || !Array.isArray(excludeWords) || excludeWords.length === 0) return false;
  return excludeWords.some((w) => isSameJapaneseWord(word, w));
}

function uniqueJapaneseWordsKeepLast(items) {
  const out = [];
  for (const v of items) {
    if (!v) continue;
    const idx = out.findIndex((x) => isSameJapaneseWord(x, v));
    if (idx >= 0) out.splice(idx, 1);
    out.push(v);
  }
  return out;
}

module.exports = {
  normalizeWordText,
  parseJapaneseWord,
  isSameJapaneseWord,
  isWordExcluded,
  uniqueJapaneseWordsKeepLast
};
