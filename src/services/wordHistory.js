const fs = require('fs');
const path = require('path');

function getHistoryFilePath() {
  const envPath = process.env.WORD_HISTORY_PATH;
  if (envPath && typeof envPath === 'string' && envPath.trim()) return envPath.trim();
  // Avoid relying on process.cwd() (can differ in serverless / Docker).
  return path.join(__dirname, '..', '..', 'data', 'word-history.json');
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

function normalizeEntry(entry) {
  // Backward compatible: entry can be "word" (string) or { word, ts } (object)
  if (typeof entry === 'string') return { word: normalizeWord(entry), ts: null };
  if (!entry || typeof entry !== 'object') return { word: '', ts: null };
  const word = normalizeWord(entry.word);
  const ts = Number.isFinite(entry.ts) ? entry.ts : null;
  return { word, ts };
}

function startOfWeekTs(date = new Date()) {
  // Monday 00:00:00 local time as week start.
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diffToMonday = (day + 6) % 7; // Mon->0, Tue->1, ... Sun->6
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diffToMonday);
  return d.getTime();
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
  return list
    .slice(-limit)
    .map(normalizeEntry)
    .map((e) => e.word)
    .filter(Boolean);
}

function getThisWeekWords({ langCode, limit = 50, now = new Date() }) {
  const { data } = loadHistory();
  const list = Array.isArray(data?.[langCode]) ? data[langCode] : [];
  const since = startOfWeekTs(now);

  const words = list
    .map(normalizeEntry)
    .filter((e) => e.word && Number.isFinite(e.ts) && e.ts >= since)
    .map((e) => e.word);

  // Keep order and cap to last `limit` items.
  return words.length > limit ? words.slice(words.length - limit) : words;
}

function addWord({ langCode, word, max = 200 }) {
  const w = normalizeWord(word);
  if (!w) return { ok: false, reason: 'empty_word' };

  const { filePath, data } = loadHistory();
  const list = Array.isArray(data?.[langCode]) ? data[langCode] : [];
  const last = list.length > 0 ? normalizeEntry(list[list.length - 1]) : null;

  // Prevent immediate duplicates and keep unique-ish history.
  if (last && last.word === w) return { ok: true, saved: false, reason: 'duplicate_last', filePath };
  const next = [...list, { word: w, ts: Date.now() }];

  // Keep last max items.
  const trimmed = next.length > max ? next.slice(next.length - max) : next;
  const out = { ...(data || {}), [langCode]: trimmed };
  saveHistory(filePath, out);
  return { ok: true, saved: true, filePath, word: w, size: trimmed.length };
}

module.exports = {
  getRecentWords,
  getThisWeekWords,
  addWord
};

