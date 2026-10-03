// Cálculo de comisiones de setter y closer. Sin React ni Supabase: se puede probar con node.
//
// Regla: cada cuota cobrada paga comisión a su setter y a su closer. Si la misma persona fue setter
// y closer de esa cuota, cobra el porcentaje de "misma persona" (no la suma de los dos).
// El rol se decide CUOTA POR CUOTA: alguien puede ser solo setter en unas y setter+closer en otras.

export const PORCENTAJES_POR_DEFECTO = { setter: 10, closer: 10, mismaPersona: 20 };

const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const nombrePersona = (valor) => {
  const limpio = String(valor ?? '').trim();
  return limpio || null;
};

/**
 * Comisiones que genera una cuota (o una venta) de `monto`.
 * Devuelve una lista de { persona, rol, porcentaje, comision }.
 */
export function comisionesDe({ monto, setter, closer }, porcentajes = PORCENTAJES_POR_DEFECTO) {
  const base = Number(monto) || 0;
  const s = nombrePersona(setter);
  const c = nombrePersona(closer);
  if (s && c && s === c) {
    return [{ persona: s, rol: 'Setter+Closer', porcentaje: porcentajes.mismaPersona, comision: redondear(base * porcentajes.mismaPersona / 100) }];
  }
  const lista = [];
  if (s) lista.push({ persona: s, rol: 'Setter', porcentaje: porcentajes.setter, comision: redondear(base * porcentajes.setter / 100) });
  if (c) lista.push({ persona: c, rol: 'Closer', porcentaje: porcentajes.closer, comision: redondear(base * porcentajes.closer / 100) });
  return lista;
}

/**
 * Lo que se guarda en las columnas comision_setter y comision_closer.
 * Si es la misma persona, la comisión de "misma persona" se parte en dos columnas (con 20% queda
 * 10 y 10), así la suma de las dos columnas siempre es lo que cobra la gente.
 */
export function columnasComision(fila, porcentajes = PORCENTAJES_POR_DEFECTO) {
  const lista = comisionesDe(fila, porcentajes);
  if (lista.length === 1 && lista[0].rol === 'Setter+Closer') {
    const total = lista[0].comision;
    const mitad = redondear(total / 2);
    return { comision_setter: mitad, comision_closer: redondear(total - mitad) };
  }
  return {
    comision_setter: lista.find((x) => x.rol === 'Setter')?.comision ?? null,
    comision_closer: lista.find((x) => x.rol === 'Closer')?.comision ?? null,
  };
}

/**
 * Resumen por persona de un conjunto de filas (cuotas cobradas o ventas).
 * Devuelve [{ nombre, total, base, filas, roles: [{ rol, porcentaje, base, total, filas }] }],
 * ordenado de mayor a menor comisión.
 */
export function resumenPorPersona(filas, porcentajes = PORCENTAJES_POR_DEFECTO) {
  const personas = new Map();
  for (const fila of filas) {
    const monto = Number(fila.monto) || 0;
    for (const { persona, rol, porcentaje, comision } of comisionesDe(fila, porcentajes)) {
      if (!personas.has(persona)) personas.set(persona, { nombre: persona, total: 0, base: 0, filas: 0, roles: new Map() });
      const p = personas.get(persona);
      p.total = redondear(p.total + comision);
      p.base = redondear(p.base + monto);
      p.filas += 1;
      if (!p.roles.has(rol)) p.roles.set(rol, { rol, porcentaje, base: 0, total: 0, filas: 0 });
      const r = p.roles.get(rol);
      r.base = redondear(r.base + monto);
      r.total = redondear(r.total + comision);
      r.filas += 1;
    }
  }
  return [...personas.values()]
    .map((p) => ({ ...p, roles: [...p.roles.values()] }))
    .sort((a, b) => b.total - a.total);
}
