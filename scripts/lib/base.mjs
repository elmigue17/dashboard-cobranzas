// Conexión a Supabase con la clave secreta, para los scripts de tu computadora (nunca para el navegador).
import { createClient } from '@supabase/supabase-js';
import { leerEntorno, requerir } from './entorno.mjs';

// Orden en que se cargan las tablas (cada una depende de las anteriores).
export const TABLAS_DEL_NEGOCIO = ['contenidos', 'leads', 'lead_contenidos', 'lead_eventos', 'llamadas', 'alumnos', 'ventas', 'cuotas'];

export function conectar() {
  const entorno = leerEntorno();
  requerir(entorno, 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY');
  return createClient(entorno.VITE_SUPABASE_URL, entorno.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function contar(db, tabla) {
  const { count, error } = await db.from(tabla).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`No se pudo contar ${tabla}: ${error.message}`);
  return count || 0;
}

/** Trae todas las filas de una tabla, de a 1000 (el máximo que devuelve Supabase por pedido). */
export async function traerTodo(db, tabla, columnas = '*') {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await db.from(tabla).select(columnas).order('created_at', { ascending: true }).range(desde, desde + 999);
    if (error) throw new Error(`No se pudo leer ${tabla}: ${error.message}`);
    filas.push(...data);
    if (data.length < 1000) return filas;
  }
}

export async function insertarEnLotes(db, tabla, filas, lote = 500) {
  for (let i = 0; i < filas.length; i += lote) {
    const { error } = await db.from(tabla).insert(filas.slice(i, i + lote));
    if (error) throw new Error(`No se pudo cargar ${tabla} (filas ${i + 1} a ${Math.min(i + lote, filas.length)}): ${error.message}`);
  }
}

/** Borra todos los datos del negocio. No toca los usuarios ni la lista de acceso. */
export async function vaciarDatosDelNegocio(db) {
  for (const tabla of [...TABLAS_DEL_NEGOCIO].reverse()) {
    const { error } = await db.from(tabla).delete().gte('created_at', '1900-01-01');
    if (error) throw new Error(`No se pudo vaciar ${tabla}: ${error.message}`);
  }
}

export async function hayDatos(db) {
  for (const tabla of ['alumnos', 'leads', 'llamadas', 'contenidos']) {
    if (await contar(db, tabla)) return true;
  }
  return false;
}
