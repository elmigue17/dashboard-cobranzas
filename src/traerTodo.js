import { supabase } from './supabaseClient';

const POR_PEDIDO = 1000; // lo máximo que Supabase devuelve en un pedido

// Trae TODAS las filas de una tabla. Un `select` solo devuelve las primeras 1000: con más alumnos,
// cuotas o leads que eso, los números del dashboard quedarían cortos sin avisar.
export async function traerTodo(tabla, { columnas = '*', orden = 'created_at', ascendente = true, desempate = ['id'] } = {}) {
  const { count, error } = await supabase.from(tabla).select('*', { count: 'exact', head: true });
  if (error) throw error;
  const paginas = Math.max(1, Math.ceil((count || 0) / POR_PEDIDO));
  const pedidos = Array.from({ length: paginas }, (_, i) => {
    let consulta = supabase.from(tabla).select(columnas).order(orden, { ascending: ascendente, nullsFirst: false });
    // Desempate estable: sin él, dos páginas podrían repetir o saltear filas.
    for (const columna of desempate) consulta = consulta.order(columna, { ascending: true });
    return consulta.range(i * POR_PEDIDO, i * POR_PEDIDO + POR_PEDIDO - 1);
  });
  const resultados = await Promise.all(pedidos);
  const filas = [];
  for (const { data, error: e } of resultados) {
    if (e) throw e;
    filas.push(...data);
  }
  return filas;
}
