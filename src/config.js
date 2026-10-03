// Lee negocio.config.js, completa lo que falte con valores por defecto y expone lo que usa la app.
// Sin React ni Supabase: lo usan también los scripts de node.
import negocio from '../negocio.config.js';

const zonaValida = (zona) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zona });
    return true;
  } catch {
    return false;
  }
};

const numero = (valor, porDefecto) => (Number.isFinite(Number(valor)) && valor !== '' && valor != null ? Number(valor) : porDefecto);

const lista = (valor) => (Array.isArray(valor) ? valor.map((x) => String(x).trim()).filter(Boolean) : []);

export const NOMBRE_NEGOCIO = String(negocio.nombre || 'Mi Negocio').trim();

/** Iniciales para el cuadrito de la barra lateral: "Academia Horizonte" -> "AH". */
export const INICIALES_NEGOCIO = NOMBRE_NEGOCIO
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((p) => p[0].toUpperCase())
  .join('') || 'D';

export const ZONA_HORARIA = zonaValida(negocio.zonaHoraria)
  ? negocio.zonaHoraria
  : (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

export const MONEDA = String(negocio.moneda || 'USD').toUpperCase();

export const FORMATO_REGIONAL = (() => {
  try {
    new Intl.NumberFormat(negocio.formatoRegional || 'es');
    return negocio.formatoRegional || 'es';
  } catch {
    return 'es';
  }
})();

const formatoMoneda = (() => {
  try {
    return new Intl.NumberFormat(FORMATO_REGIONAL, { style: 'currency', currency: MONEDA, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return new Intl.NumberFormat(FORMATO_REGIONAL, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
})();

/** 1234.5 -> "$1,234.50" (o "S/ 1,234.50", "1.234,50 €"... según la moneda y el formato). */
export const fmtMoney = (n) => formatoMoneda.format(Number(n || 0));

export const PROGRAMAS = (Array.isArray(negocio.programas) ? negocio.programas : [])
  .filter((p) => p && String(p.nombre || '').trim())
  .map((p) => ({
    nombre: String(p.nombre).trim(),
    duracionMeses: numero(p.duracionMeses, 1),
    precio: numero(p.precio, null),
    cuotas: Math.max(1, Math.round(numero(p.cuotas, 1))),
  }));

export const NOMBRES_PROGRAMAS = PROGRAMAS.map((p) => p.nombre);

/** Duración que se usa si un alumno tiene un programa que no está en la configuración. */
export const DURACION_POR_DEFECTO = 1;

export const programaPorNombre = (nombre) => {
  const buscado = String(nombre || '').trim().toLowerCase();
  return PROGRAMAS.find((p) => p.nombre.toLowerCase() === buscado) || null;
};

export const duracionDePrograma = (nombre) => programaPorNombre(nombre)?.duracionMeses ?? DURACION_POR_DEFECTO;

export const EQUIPO = {
  setters: lista(negocio.equipo?.setters),
  closers: lista(negocio.equipo?.closers),
};

export const PORCENTAJES = {
  setter: numero(negocio.comisiones?.setter, 10),
  closer: numero(negocio.comisiones?.closer, 10),
  mismaPersona: numero(negocio.comisiones?.mismaPersona, numero(negocio.comisiones?.setter, 10) + numero(negocio.comisiones?.closer, 10)),
};

/** 'cobrado': sobre cada cuota que entra. 'vendido': sobre el total de la venta, el mes de la venta. */
export const COMISION_SOBRE = negocio.comisiones?.sobre === 'vendido' ? 'vendido' : 'cobrado';
