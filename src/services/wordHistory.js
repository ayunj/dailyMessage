const fs = require('fs');
const path = require('path');

function getHistoryFilePath() {
  const envPath = process.env.WORD_HISTORY_PATH;
  if (envPath && typeof envPath === 'string' && envPath.trim()) return envPath.trim();
  return path.join(process.cwd(), 'data', 'word-history.json');
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeWord(w) {
  if (typeof w !== 'string') return '';
  return w.trim();
}

function loadHistory() {
  const filePath = getHistoryFilePath();
  try {
    if (!fs.existsSync(filePath)) return { filePath, data: {} };
    const raw = fs.readFileSync(filePath, 'utf8');
    const json = safeParseJson(raw);
    if (!json || typeof json !== 'object') return { filePath, data: {} };
    return { filePath, data: json };
  } catch {
    return { filePath, data: {} };
  }
}

function saveHistory(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function getRecentWords({ langCode, limit = 50 }) {
  const { data } = loadHistory();
  const list = Array.isArray(data?.[langCode]) ? data[langCode] : [];
  return list.slice(-limit).map(normalizeWord).filter(Boolean);
}

function addWord({ langCode, word, max = 200 }) {
  const w = normalizeWord(word);
  if (!w) return;

  const { filePath, data } = loadHistory();
  const list = Array.isArray(data?.[langCode]) ? data[langCode] : [];

  // Prevent immediate duplicates and keep unique-ish history.
  if (list.length > 0 && normalizeWord(list[list.length - 1]) === w) return;
  const next = [...list, w];

  // Keep last max items.
  const trimmed = next.length > max ? next.slice(next.length - max) : next;
  const out = { ...(data || {}), [langCode]: trimmed };
  saveHistory(filePath, out);
}

module.exports = {
  getRecentWords,
  addWord
};

