// Fechas de calendario (vencimientos, pagos, inicio y fin de programas).
//
// En la base son columnas `date`: '2026-10-03', sin hora ni zona horaria. Acá se manejan siempre
// como ese texto 'AAAA-MM-DD'. Nunca se pasan por `new Date('2026-10-03')`, que las lee como la
// medianoche UTC y en América las muestra un día antes.

import { APP_TIME_ZONE, getTimeZoneDateKey } from './timezone.js';

const pad = (n) => String(n).padStart(2, '0');

const partes = (ymd) => {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  return { y, m, d };
};

const diasDelMes = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Hoy en la zona horaria del negocio, como 'AAAA-MM-DD'. */
export const hoy = () => getTimeZoneDateKey(new Date(), APP_TIME_ZONE);

/** true si el valor tiene forma de fecha 'AAAA-MM-DD'. */
export const esFecha = (valor) => /^\d{4}-\d{2}-\d{2}/.test(String(valor || ''));

/** Suma meses respetando el fin de mes: 31/01 + 1 mes = 28/02 (o 29). */
export const sumarMeses = (ymd, n) => {
  const { y, m, d } = partes(ymd);
  const total = (y * 12 + (m - 1)) + Number(n);
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${pad(nm)}-${pad(Math.min(d, diasDelMes(ny, nm)))}`;
};

export const sumarDias = (ymd, n) => {
  const { y, m, d } = partes(ymd);
  const fecha = new Date(Date.UTC(y, m - 1, d + Number(n)));
  return fecha.toISOString().slice(0, 10);
};

/** Días que hay de `desde` a `hasta` (negativo si `hasta` es anterior). */
export const diasEntre = (desde, hasta) => {
  const a = partes(desde), b = partes(hasta);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
};

/** 'AAAA-MM' de una fecha. */
export const mesDe = (ymd) => String(ymd || '').slice(0, 7);

const formatoFecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** '2026-10-03' -> '3 oct 2026'. */
export const fmtFecha = (ymd) => {
  if (!esFecha(ymd)) return '-';
  const { y, m, d } = partes(ymd);
  return formatoFecha.format(new Date(Date.UTC(y, m - 1, d)));
};
