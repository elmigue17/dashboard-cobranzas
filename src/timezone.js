// Zona horaria del navegador. Todas las fechas "hoy", "ayer" y "este mes" se calculan en esta zona.
export const APP_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

// Construir un Intl.DateTimeFormat es caro (decenas de µs, mucho más en celular) y acá se
// llamaba una vez por fila. Los formatters no tienen estado, así que se cachean por zona.
const formatterCache = new Map();

function getFormatter(timeZone) {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function getDateTimeParts(date, timeZone = APP_TIME_ZONE) {
  const formatter = getFormatter(timeZone);

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function getTimeZoneOffsetMs(date, timeZone = APP_TIME_ZONE) {
  const parts = getDateTimeParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - date.getTime();
}

export function getTimeZoneDateKey(date = new Date(), timeZone = APP_TIME_ZONE) {
  const parts = getDateTimeParts(date, timeZone);
  const year = String(parts.year);
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

function zonedTimeToUtc(dateKey, time = '00:00:00', timeZone = APP_TIME_ZONE) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute, second] = time.split(':').map(Number);

  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);

  // Iterate twice to stabilize the offset conversion.
  for (let i = 0; i < 2; i += 1) {
    const offset = getTimeZoneOffsetMs(new Date(utcMs), timeZone);
    utcMs = Date.UTC(year, month - 1, day, hour, minute, second) - offset;
  }

  return new Date(utcMs);
}

export function getDayRangeForDateKey(dateKey, timeZone = APP_TIME_ZONE) {
  const start = zonedTimeToUtc(dateKey, '00:00:00', timeZone);
  const nextDateKey = addDaysToDateKey(dateKey, 1);
  const nextStart = zonedTimeToUtc(nextDateKey, '00:00:00', timeZone);
  const end = new Date(nextStart.getTime() - 1);

  return {
    dateKey,
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function getCurrentMonthRange(timeZone = APP_TIME_ZONE) {
  const todayKey = getTimeZoneDateKey(new Date(), timeZone);
  const [year, month] = todayKey.split('-').map(Number);
  const startKey = `${year}-${String(month).padStart(2, '0')}-01`;
  return {
    startKey,
    endKey: todayKey,
  };
}

function getLastMonthRange(timeZone = APP_TIME_ZONE) {
  const todayKey = getTimeZoneDateKey(new Date(), timeZone);
  const [year, month] = todayKey.split('-').map(Number);
  const pivot = new Date(Date.UTC(year, month - 1, 1));
  pivot.setUTCMonth(pivot.getUTCMonth() - 1);

  const startKey = `${pivot.getUTCFullYear()}-${String(pivot.getUTCMonth() + 1).padStart(2, '0')}-01`;
  const endKey = addDaysToDateKey(
    `${year}-${String(month).padStart(2, '0')}-01`,
    -1,
  );

  return { startKey, endKey };
}

export function getRangeBounds(range, customStartDate = '', customEndDate = '', timeZone = APP_TIME_ZONE) {
  if (range === 'ALL') return null;

  const todayKey = getTimeZoneDateKey(new Date(), timeZone);

  if (range === 'TODAY') {
    return getDayRangeForDateKey(todayKey, timeZone);
  }

  if (range === 'YESTERDAY') {
    return getDayRangeForDateKey(addDaysToDateKey(todayKey, -1), timeZone);
  }

  if (range === 'LAST_7') {
    const startKey = addDaysToDateKey(todayKey, -6);
    const start = getDayRangeForDateKey(startKey, timeZone);
    const end = getDayRangeForDateKey(todayKey, timeZone);
    return { dateKey: todayKey, start: start.start, end: end.end, startIso: start.startIso, endIso: end.endIso };
  }

  if (range === 'LAST_30') {
    const startKey = addDaysToDateKey(todayKey, -29);
    const start = getDayRangeForDateKey(startKey, timeZone);
    const end = getDayRangeForDateKey(todayKey, timeZone);
    return { dateKey: todayKey, start: start.start, end: end.end, startIso: start.startIso, endIso: end.endIso };
  }

  if (range === 'THIS_MONTH') {
    const { startKey, endKey } = getCurrentMonthRange(timeZone);
    const start = getDayRangeForDateKey(startKey, timeZone);
    const end = getDayRangeForDateKey(endKey, timeZone);
    return { dateKey: endKey, start: start.start, end: end.end, startIso: start.startIso, endIso: end.endIso };
  }

  if (range === 'LAST_MONTH') {
    const { startKey, endKey } = getLastMonthRange(timeZone);
    const start = getDayRangeForDateKey(startKey, timeZone);
    const end = getDayRangeForDateKey(endKey, timeZone);
    return { dateKey: endKey, start: start.start, end: end.end, startIso: start.startIso, endIso: end.endIso };
  }

  if (range === 'CUSTOM') {
    if (!customStartDate || !customEndDate) return null;
    const start = getDayRangeForDateKey(customStartDate, timeZone);
    const end = getDayRangeForDateKey(customEndDate, timeZone);
    return { dateKey: customEndDate, start: start.start, end: end.end, startIso: start.startIso, endIso: end.endIso };
  }

  return null;
}

/**
 * Devuelve un predicado con los límites del rango ya calculados.
 * Usar esto (y no isDateInRange) cuando se filtran muchas filas: calcula los bounds
 * una sola vez en lugar de una vez por fila.
 */
export function makeRangeMatcher(range, customStartDate = '', customEndDate = '', timeZone = APP_TIME_ZONE) {
  const bounds = getRangeBounds(range, customStartDate, customEndDate, timeZone);
  if (!bounds) return (dateString) => Boolean(dateString);

  const startMs = bounds.start.getTime();
  const endMs = bounds.end.getTime();

  return (dateString) => {
    if (!dateString) return false;
    const timestamp = new Date(dateString).getTime();
    return timestamp >= startMs && timestamp <= endMs;
  };
}

export function isDateInRange(dateString, range, customStartDate = '', customEndDate = '', timeZone = APP_TIME_ZONE) {
  if (!dateString) return false;
  return makeRangeMatcher(range, customStartDate, customEndDate, timeZone)(dateString);
}

