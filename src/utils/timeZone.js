function parseGmtOffsetMinutes(tzNameValue) {
  // Examples: "GMT+9", "GMT+09:00", "UTC+9"
  if (typeof tzNameValue !== 'string') return null;
  const m = tzNameValue.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!m) return null;
  const sign = m[1] === '-' ? -1 : 1;
  const hours = Number(m[2]);
  const mins = m[3] ? Number(m[3]) : 0;
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
  return sign * (hours * 60 + mins);
}

function getTimeZoneOffsetMinutes(date, timeZone) {
  // Use shortOffset when available (Node 18+ supports it in most builds).
  // Fallback: hardcode Asia/Seoul as +540 (no DST).
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = dtf.formatToParts(date);
    const tzName = parts.find((p) => p.type === 'timeZoneName')?.value;
    const off = parseGmtOffsetMinutes(tzName);
    if (Number.isFinite(off)) return off;
  } catch {
    // ignore
  }

  if (timeZone === 'Asia/Seoul') return 540;
  return null;
}

function getWeekdayIndexInTimeZone(date, timeZone) {
  // Returns 0=Sun..6=Sat computed in the given IANA timeZone.
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  switch (weekday) {
    case 'Sun':
      return 0;
    case 'Mon':
      return 1;
    case 'Tue':
      return 2;
    case 'Wed':
      return 3;
    case 'Thu':
      return 4;
    case 'Fri':
      return 5;
    case 'Sat':
      return 6;
    default:
      return date.getDay();
  }
}

function getYmdInTimeZone(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = dtf.formatToParts(date);
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const d = Number(parts.find((p) => p.type === 'day')?.value);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
  }
  return { year: y, month: m, day: d };
}

function startOfWeekTsInTimeZone(date = new Date(), timeZone = 'Asia/Seoul') {
  // Monday 00:00:00 in given timeZone, returned as epoch ms.
  const weekday = getWeekdayIndexInTimeZone(date, timeZone); // 0=Sun..6=Sat
  const diffToMonday = (weekday + 6) % 7; // Mon->0, Tue->1, ... Sun->6
  const { year, month, day } = getYmdInTimeZone(date, timeZone);

  // Build "today 00:00" in the target timeZone as an instant.
  // We approximate by using the zone offset at that date.
  const offsetMin = getTimeZoneOffsetMinutes(date, timeZone);
  const offsetMs = Number.isFinite(offsetMin) ? offsetMin * 60_000 : 0;

  const todayMidnightUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMs;
  const mondayMidnightMs = todayMidnightUtcMs - diffToMonday * 24 * 60 * 60 * 1000;
  return mondayMidnightMs;
}

module.exports = {
  getWeekdayIndexInTimeZone,
  startOfWeekTsInTimeZone,
  getTimeZoneOffsetMinutes
};

