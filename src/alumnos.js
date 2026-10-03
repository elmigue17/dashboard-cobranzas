// Estado de un alumno. Sin React ni Supabase: se prueba con `npm test`.
//
// "Pausado" (congelado) y "Churneado" (se dio de baja) los marca alguien a mano.
// "Activo", "Por vencer" y "Vencido" salen de la fecha de fin, todos los días, sin que nadie
// tenga que actualizarlos.
import { diasEntre, esFecha } from './fechas.js';

export const DIAS_POR_VENCER = 15;

export const ESTADOS_ALUMNO = ['Activo', 'Por vencer', 'Vencido', 'Pausado', 'Churneado'];

/** Estados que se eligen a mano (los otros se calculan). */
export const ESTADOS_MANUALES = ['Activo', 'Pausado', 'Churneado'];

export function estadoDeAlumno(alumno, hoy) {
  if (alumno.estado === 'Churneado' || alumno.fecha_baja) return 'Churneado';
  if (alumno.estado === 'Pausado' || alumno.congelado_desde) return 'Pausado';
  if (!esFecha(alumno.fecha_fin)) return 'Activo';
  const dias = diasEntre(hoy, alumno.fecha_fin);
  if (dias < 0) return 'Vencido';
  if (dias <= DIAS_POR_VENCER) return 'Por vencer';
  return 'Activo';
}
