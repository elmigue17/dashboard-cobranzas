const GENERIC_NAME_TOKENS = new Set([
  'carru',
  'carrusel',
  'hist',
  'historia',
  'pieza',
  'reel',
]);

function collapseWhitespace(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function titleCaseWord(word) {
  if (!word) return '';
  if (word.toUpperCase() === word && word.length <= 4) {
    return word.toUpperCase();
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function titleCaseText(value) {
  return collapseWhitespace(value)
    .split(' ')
    .filter(Boolean)
    .map(titleCaseWord)
    .join(' ');
}

function formatContentDate(fecha) {
  if (!fecha) return '';
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(date).replace(/\./g, '');
}

export function normalizeContentOriginKey(value) {
  const normalized = (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || null;
}

export function inferContentType(cod, nombre) {
  const code = (cod || '').trim().toUpperCase();
  const name = collapseWhitespace(nombre).toLowerCase();

  if (code === 'NEW FOLLOW' || name.includes('new follow')) return 'Nuevo Follow';
  if (code.startsWith('H') || name.startsWith('hist')) return 'Historia';
  if (code.startsWith('C') || name.startsWith('carru') || name.startsWith('carrusel')) return 'Carrusel';
  if (code.startsWith('R') || name.startsWith('reel')) return 'Reel';

  return 'Pieza';
}

export function buildDescriptiveContentName(nombre, cod, fecha) {
  const contentType = inferContentType(cod, nombre);

  if (contentType === 'Nuevo Follow') {
    return 'Nuevo Follow';
  }

  const cleanedName = collapseWhitespace(nombre)
    .replace(/^(carru|carrusel|historia|hist|reel|pieza)\b[\s:_-]*/i, '')
    .replace(/\b\d{2}\/\d{2}\b/g, '');

  const titledName = titleCaseText(cleanedName);
  const safeDate = formatContentDate(fecha);

  if (!titledName) {
    return safeDate ? `${contentType} ${safeDate}` : contentType;
  }

  const lowered = titledName.toLowerCase();
  if (GENERIC_NAME_TOKENS.has(lowered)) {
    return safeDate ? `${contentType} ${safeDate}` : contentType;
  }

  const parts = [contentType];
  if (lowered !== contentType.toLowerCase()) {
    parts.push(titledName);
  }
  if (safeDate) {
    parts.push(safeDate);
  }

  return parts.join(' ').trim();
}

export function getContentDisplayLabel(content) {
  if (!content) return '-';

  const name = collapseWhitespace(content.nombre);
  if (name) return name;
  if (content.cod) return content.cod;
  if (content.origen_key) return content.origen_key;

  return 'Pieza sin nombre';
}
