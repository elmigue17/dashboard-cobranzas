// Resumen de lo que hay en la base: para revisar una importación o los datos de ejemplo.
import { traerTodo, contar } from './base.mjs';
import { fmtMoney, PORCENTAJES, COMISION_SOBRE } from '../../src/config.js';
import { hoy as hoyEnZona, sumarDias, sumarMeses, mesDe } from '../../src/fechas.js';
import { estadoDeAlumno } from '../../src/alumnos.js';
import { resumenPorPersona } from '../../src/comisiones.js';

const suma = (filas) => filas.reduce((s, f) => s + Number(f.monto || 0), 0);

export async function imprimirResumen(db) {
  const hoy = hoyEnZona();
  const [alumnos, ventas, cuotas] = await Promise.all([
    traerTodo(db, 'alumnos'), traerTodo(db, 'ventas'), traerTodo(db, 'cuotas'),
  ]);
  const [leads, llamadas, contenidos] = await Promise.all([contar(db, 'leads'), contar(db, 'llamadas'), contar(db, 'contenidos')]);

  const porEstado = {};
  for (const a of alumnos) {
    const e = estadoDeAlumno(a, hoy);
    porEstado[e] = (porEstado[e] || 0) + 1;
  }
  const porPrograma = {};
  for (const v of ventas) porPrograma[v.programa] = (porPrograma[v.programa] || 0) + Number(v.monto);

  const pagadas = cuotas.filter((c) => c.estado === 'Pagado');
  const pendientes = cuotas.filter((c) => c.estado === 'Pendiente');
  const vencidas = pendientes.filter((c) => c.fecha_vencimiento && c.fecha_vencimiento < hoy);
  const proximas = pendientes.filter((c) => c.fecha_vencimiento >= hoy && c.fecha_vencimiento <= sumarDias(hoy, 30));
  const incobrables = cuotas.filter((c) => c.estado === 'Incobrable');
  const mes = mesDe(hoy);
  const mesPasado = mesDe(sumarMeses(`${mes}-01`, -1));
  const cobradoMes = pagadas.filter((c) => mesDe(c.fecha_pago) === mes);

  console.log(`\nAlumnos: ${alumnos.length}  (${Object.entries(porEstado).map(([e, n]) => `${e} ${n}`).join(', ') || 'ninguno'})`);
  console.log(`Ventas: ${ventas.length} por ${fmtMoney(suma(ventas))}`);
  for (const [p, total] of Object.entries(porPrograma).sort((a, b) => b[1] - a[1])) console.log(`  ${p}: ${fmtMoney(total)}`);
  console.log(`Cuotas: ${cuotas.length}`);
  console.log(`  pagadas:            ${pagadas.length} por ${fmtMoney(suma(pagadas))}`);
  console.log(`  pendientes:         ${pendientes.length} por ${fmtMoney(suma(pendientes))}`);
  console.log(`    vencidas sin pagar: ${vencidas.length} por ${fmtMoney(suma(vencidas))}`);
  console.log(`    vencen en 30 días:  ${proximas.length} por ${fmtMoney(suma(proximas))}`);
  console.log(`  incobrables:        ${incobrables.length} por ${fmtMoney(suma(incobrables))}`);
  console.log(`Cobrado este mes (${mes}): ${fmtMoney(suma(cobradoMes))}`);

  const filasComision = COMISION_SOBRE === 'vendido'
    ? ventas.filter((v) => mesDe(v.fecha_venta) === mesPasado)
    : pagadas.filter((c) => mesDe(c.fecha_pago) === mesPasado);
  const comisiones = resumenPorPersona(filasComision, PORCENTAJES);
  console.log(`Comisiones de ${mesPasado} (sobre lo ${COMISION_SOBRE}): ${comisiones.map((p) => `${p.nombre} ${fmtMoney(p.total)}`).join(', ') || 'ninguna'}`);
  console.log(`Leads: ${leads}  ·  Llamadas: ${llamadas}  ·  Piezas de contenido: ${contenidos}`);
}
