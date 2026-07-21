const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { startOfWeekTsInTimeZone } = require('../utils/timeZone');
const { isSameJapaneseWord, uniqueJapaneseWordsKeepLast } = require('../utils/japaneseWord');

function getHistoryLocation() {
  const gcsUri = process.env.WORD_HISTORY_GCS_URI;
  if (gcsUri && typeof gcsUri === 'string' && gcsUri.trim()) return gcsUri.trim();

  const envPath = process.env.WORD_HISTORY_PATH;
  if (envPath && typeof envPath === 'string' && envPath.trim()) return envPath.trim();

  // Avoid relying on process.cwd() (can differ in serverless / Docker).
  return path.join(__dirname, '..', '..', 'data', 'word-history.json');
}

function parseGcsUri(uri) {
  // gs://bucket/path/to/file.json
  if (typeof uri !== 'string') return null;
  const m = uri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!m) return null;
  return { bucket: m[1], file: m[2] };
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

function startOfWeekTs(date = new Date(), timeZone = 'Asia/Seoul') {
  // Monday 00:00:00 in the given timeZone as week start.
  return startOfWeekTsInTimeZone(date, timeZone);
}

function describeHistoryLocation() {
  const location = getHistoryLocation();
  const isGcs = !!parseGcsUri(location);
  // Cloud Run / Cloud Functions set K_SERVICE. On these, the container filesystem
  // is ephemeral, so a local-file location silently loses saved words on restart.
  const isServerless = !!(process.env.K_SERVICE || process.env.FUNCTION_TARGET);
  const persistent = isGcs; // only GCS survives restarts/scaling in serverless
  const volatileInServerless = isServerless && !isGcs;
  return { location, isGcs, isServerless, persistent, volatileInServerless };
}

async function loadHistory() {
  const location = getHistoryLocation();
  const gcs = parseGcsUri(location);

  if (gcs) {
    const storage = new Storage();
    const file = storage.bucket(gcs.bucket).file(gcs.file);
    try {
      const [buf] = await file.download();
      const json = safeParseJson(buf.toString('utf8'));
      if (!json || typeof json !== 'object') return { location, data: {} };
      return { location, data: json };
    } catch (e) {
      // Not found / not readable -> treat as empty.
      return { location, data: {} };
    }
  }

  const filePath = location;
  try {
    if (!fs.existsSync(filePath)) return { location: filePath, data: {} };
    const raw = fs.readFileSync(filePath, 'utf8');
    const json = safeParseJson(raw);
    if (!json || typeof json !== 'object') return { location: filePath, data: {} };
    return { location: filePath, data: json };
  } catch {
    return { location: filePath, data: {} };
  }
}

async function saveHistory(location, data) {
  const gcs = parseGcsUri(location);
  const body = JSON.stringify(data, null, 2);

  if (gcs) {
    const storage = new Storage();
    const file = storage.bucket(gcs.bucket).file(gcs.file);
    await file.save(body, { contentType: 'application/json; charset=utf-8' });
    return;
  }

  const filePath = location;
  ensureDir(filePath);
  fs.writeFileSync(filePath, body, 'utf8');
}

async function getRecentWords({ langCode, limit = 50 }) {
  const { data } = await loadHistory();
  const list = Array.isArray(data?.[langCode]) ? data[langCode] : [];
  const words = list
    .map(normalizeEntry)
    .map((e) => e.word)
    .filter(Boolean);
  const uniqueWords = uniqueJapaneseWordsKeepLast(words);
  return uniqueWords.length > limit ? uniqueWords.slice(uniqueWords.length - limit) : uniqueWords;
}

async function getThisWeekWords({ langCode, limit = 50, now = new Date(), timeZone = 'Asia/Seoul' }) {
  const { data } = await loadHistory();
  const list = Array.isArray(data?.[langCode]) ? data[langCode] : [];
  const since = startOfWeekTs(now, timeZone);

  const words = list
    .map(normalizeEntry)
    .filter((e) => e.word && Number.isFinite(e.ts) && e.ts >= since)
    .map((e) => e.word);

  const uniqueWords = uniqueJapaneseWordsKeepLast(words);

  // Keep order and cap to last `limit` items.
  return uniqueWords.length > limit ? uniqueWords.slice(uniqueWords.length - limit) : uniqueWords;
}

async function addWord({ langCode, word, max = 200 }) {
  const w = normalizeWord(word);
  if (!w) return { ok: false, reason: 'empty_word' };

  const { location, data } = await loadHistory();
  const list = Array.isArray(data?.[langCode]) ? data[langCode] : [];
  const existingWords = list.map(normalizeEntry).map((e) => e.word).filter(Boolean);
  if (existingWords.some((existing) => isSameJapaneseWord(existing, w))) {
    return { ok: true, saved: false, reason: 'duplicate_existing', location };
  }
  const next = [...list, { word: w, ts: Date.now() }];

  // Keep last max items.
  const trimmed = next.length > max ? next.slice(next.length - max) : next;
  const out = { ...(data || {}), [langCode]: trimmed };
  await saveHistory(location, out);
  return { ok: true, saved: true, location, word: w, size: trimmed.length };
}

module.exports = {
  getRecentWords,
  getThisWeekWords,
  addWord,
  describeHistoryLocation
};

