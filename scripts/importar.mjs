// Carga tus datos (alumnos, ventas y cuotas) desde un archivo JSON con el formato de
// docs/IMPORTAR.md. Lo arma Claude Code a partir de tu Sheet o tu Airtable exportado a CSV.
//
//   npm run importar -- mis-datos/importar.json --probar      revisa el archivo y muestra qué cargaría
//   npm run importar -- mis-datos/importar.json               carga (si la base no tiene datos)
//   npm run importar -- mis-datos/importar.json --reemplazar  borra los datos del negocio y carga
//   npm run importar -- mis-datos/importar.json --agregar     suma estos datos a los que ya hay
//
// Si algo falla a mitad de camino, borra lo que alcanzó a cargar: o entra todo o no entra nada.
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { conectar, hayDatos, insertarEnLotes, vaciarDatosDelNegocio } from './lib/base.mjs';
import { imprimirResumen } from './lib/resumen.mjs';
import { NOMBRES_PROGRAMAS, programaPorNombre, EQUIPO, fmtMoney } from '../src/config.js';
import { hoy as hoyEnZona, sumarMeses, sumarDias } from '../src/fechas.js';

const args = process.argv.slice(2);
const archivo = args.find((a) => !a.startsWith('--'));
const probar = args.includes('--probar');
const reemplazar = args.includes('--reemplazar');
const agregar = args.includes('--agregar');

if (!archivo) {
  console.error('Uso: npm run importar -- mis-datos/importar.json [--probar | --reemplazar | --agregar]');
  process.exit(1);
}

let datos;
try {
  datos = JSON.parse(readFileSync(archivo, 'utf8').replace(/^﻿/, ''));
} catch (e) {
  console.error(`No se pudo leer ${archivo}: ${e.message}`);
  process.exit(1);
}

const HOY = hoyEnZona();
const errores = [];
const avisos = [];
const ESTADOS_CUOTA = ['Pendiente', 'Pagado', 'Incobrable'];
const ESTADOS_ALUMNO = ['Activo', 'Por vencer', 'Vencido', 'Pausado', 'Churneado'];
const equipo = new Set([...EQUIPO.setters, ...EQUIPO.closers].map((n) => n.toLowerCase()));

const esFechaValida = (v) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d));
  return f.getUTCFullYear() === y && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
};
const numero = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
const texto = (v) => (v == null ? null : String(v).trim() || null);
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const filas = { alumnos: [], ventas: [], cuotas: [] };

if (!Array.isArray(datos.alumnos)) {
  errores.push('El archivo tiene que tener una lista "alumnos".');
} else {
  const nombresVistos = new Map();
  datos.alumnos.forEach((a, i) => {
    const quien = a?.nombre ? `"${a.nombre}"` : `alumno #${i + 1}`;
    const nombre = texto(a?.nombre);
    if (!nombre) {
      errores.push(`${quien}: falta el nombre.`);
      return;
    }
    const clave = nombre.toLowerCase();
    if (nombresVistos.has(clave)) avisos.push(`${quien} aparece dos veces (#${nombresVistos.get(clave)} y #${i + 1}). Se cargan como dos alumnos distintos.`);
    nombresVistos.set(clave, i + 1);

    let estado = texto(a.estado) || 'Activo';
    if (!ESTADOS_ALUMNO.includes(estado)) {
      errores.push(`${quien}: estado "${a.estado}" no existe (usa ${ESTADOS_ALUMNO.join(', ')}).`);
      return;
    }
    if (!['Pausado', 'Churneado'].includes(estado)) estado = 'Activo'; // los demás se calculan con la fecha de fin
    for (const campo of ['fecha_baja', 'congelado_desde']) {
      if (a[campo] != null && !esFechaValida(a[campo])) errores.push(`${quien}: ${campo} "${a[campo]}" no es una fecha AAAA-MM-DD.`);
    }
    const diasCongelados = a.dias_congelados == null ? 0 : Math.round(numero(a.dias_congelados));
    if (!Number.isFinite(diasCongelados) || diasCongelados < 0) errores.push(`${quien}: dias_congelados tiene que ser un número de 0 en adelante.`);

    const alumnoId = randomUUID();
    const ventas = Array.isArray(a.ventas) ? a.ventas : [];
    if (!ventas.length) avisos.push(`${quien}: no tiene ventas. Entra al directorio sin programa ni cuotas.`);

    const ventasDelAlumno = [];
    ventas.forEach((v, j) => {
      const cual = `${quien}, venta ${j + 1}`;
      const programa = texto(v?.programa);
      const monto = numero(v?.monto);
      const fechaVenta = v?.fecha_venta ?? v?.fecha_inicio;
      const fechaInicio = v?.fecha_inicio ?? fechaVenta;
      if (!programa) errores.push(`${cual}: falta el programa.`);
      if (!(monto > 0)) errores.push(`${cual}: el monto tiene que ser un número mayor que cero (llegó "${v?.monto}").`);
      if (!esFechaValida(fechaVenta)) errores.push(`${cual}: fecha_venta "${fechaVenta}" no es una fecha AAAA-MM-DD.`);
      if (!esFechaValida(fechaInicio)) errores.push(`${cual}: fecha_inicio "${fechaInicio}" no es una fecha AAAA-MM-DD.`);
      if (!programa || !(monto > 0) || !esFechaValida(fechaVenta) || !esFechaValida(fechaInicio)) return;

      const delPrograma = programaPorNombre(programa);
      if (!delPrograma) avisos.push(`${cual}: el programa "${programa}" no está en negocio.config.js (${NOMBRES_PROGRAMAS.join(', ') || 'no hay programas'}).`);
      let duracion = v.duracion_meses != null ? numero(v.duracion_meses) : delPrograma?.duracionMeses;
      if (!(duracion > 0)) {
        avisos.push(`${cual}: no se sabe cuántos meses dura "${programa}". Se toma 1 mes.`);
        duracion = 1;
      }
      const setter = texto(v.setter);
      const closer = texto(v.closer);
      for (const persona of [setter, closer]) {
        if (persona && equipo.size && !equipo.has(persona.toLowerCase())) avisos.push(`${cual}: "${persona}" no está en el equipo de negocio.config.js.`);
      }

      const ventaId = randomUUID();
      const cuotasCrudas = Array.isArray(v.cuotas) ? v.cuotas : [];
      if (!cuotasCrudas.length) {
        errores.push(`${cual}: no tiene cuotas. Si se pagó entera, pon una cuota Pagada por el total.`);
        return;
      }
      const cuotas = [];
      cuotasCrudas.forEach((c, k) => {
        const cuota = `${cual}, cuota ${c?.n ?? k + 1}`;
        const montoCuota = numero(c?.monto);
        const estadoCuota = texto(c?.estado) || 'Pendiente';
        if (!(montoCuota >= 0)) errores.push(`${cuota}: monto "${c?.monto}" no es un número.`);
        if (!esFechaValida(c?.vence)) errores.push(`${cuota}: vence "${c?.vence}" no es una fecha AAAA-MM-DD.`);
        if (!ESTADOS_CUOTA.includes(estadoCuota)) errores.push(`${cuota}: estado "${c?.estado}" no existe (usa ${ESTADOS_CUOTA.join(', ')}).`);
        let pagadaEl = c?.pagada_el ?? null;
        if (estadoCuota === 'Pagado') {
          if (pagadaEl == null) {
            pagadaEl = c?.vence;
            avisos.push(`${cuota}: está pagada pero sin fecha de pago. Se usa la de vencimiento (${c?.vence}).`);
          } else if (!esFechaValida(pagadaEl)) {
            errores.push(`${cuota}: pagada_el "${pagadaEl}" no es una fecha AAAA-MM-DD.`);
          } else if (pagadaEl > HOY) {
            avisos.push(`${cuota}: la fecha de pago (${pagadaEl}) es posterior a hoy.`);
          }
        } else {
          pagadaEl = null;
        }
        cuotas.push({
          id: randomUUID(), venta_id: ventaId, alumno_id: alumnoId, n_cuota: c?.n != null ? Math.round(numero(c.n)) : null,
          monto: r2(montoCuota), fecha_vencimiento: c?.vence, fecha_pago: pagadaEl, estado: estadoCuota,
          setter, closer, notas: texto(c?.notas),
        });
      });
      // Numeración: la que venga, o por orden de vencimiento.
      cuotas.sort((x, y) => (x.n_cuota ?? Infinity) - (y.n_cuota ?? Infinity) || String(x.fecha_vencimiento).localeCompare(String(y.fecha_vencimiento)));
      cuotas.forEach((c, k) => { if (c.n_cuota == null) c.n_cuota = k + 1; });
      const totalCuotas = r2(cuotas.reduce((s, c) => s + (Number.isFinite(c.monto) ? c.monto : 0), 0));
      if (Math.abs(totalCuotas - monto) > 0.01) avisos.push(`${cual}: las cuotas suman ${fmtMoney(totalCuotas)} y la venta es de ${fmtMoney(monto)}.`);

      const venta = {
        id: ventaId, alumno_id: alumnoId, programa, monto: r2(monto), fecha_venta: fechaVenta, fecha_inicio: fechaInicio,
        fecha_fin: sumarMeses(fechaInicio, duracion), n_cuotas: cuotas.length, setter, closer,
        es_renovacion: v.es_renovacion === true || (v.es_renovacion == null && j > 0), notas: texto(v.notas),
        _duracion: duracion,
      };
      ventasDelAlumno.push(venta);
      filas.cuotas.push(...cuotas);
    });

    // El alumno toma programa, fechas y equipo de su venta más reciente.
    const ultima = [...ventasDelAlumno].sort((x, y) => x.fecha_inicio.localeCompare(y.fecha_inicio)).pop();
    filas.alumnos.push({
      id: alumnoId, nombre, email: texto(a.email), telefono: texto(a.telefono), programa: ultima?.programa ?? null,
      estado, fecha_inicio: ultima?.fecha_inicio ?? null,
      fecha_fin: ultima ? sumarDias(ultima.fecha_fin, Number.isFinite(diasCongelados) ? diasCongelados : 0) : null,
      duracion_meses: ultima?._duracion ?? null, fecha_baja: a.fecha_baja ?? null, congelado_desde: a.congelado_desde ?? null,
      dias_congelados: Number.isFinite(diasCongelados) ? diasCongelados : 0, setter: ultima?.setter ?? null, closer: ultima?.closer ?? null,
      notas: texto(a.notas),
    });
    filas.ventas.push(...ventasDelAlumno.map(({ _duracion, ...v }) => v));
  });
}

const noInterpretado = Array.isArray(datos.no_interpretado) ? datos.no_interpretado : [];

console.log(`Archivo: ${archivo}`);
console.log(`Para cargar: ${filas.alumnos.length} alumnos, ${filas.ventas.length} ventas, ${filas.cuotas.length} cuotas.`);
const pagadas = filas.cuotas.filter((c) => c.estado === 'Pagado');
const pendientes = filas.cuotas.filter((c) => c.estado === 'Pendiente');
console.log(`Cuotas pagadas: ${pagadas.length} por ${fmtMoney(pagadas.reduce((s, c) => s + c.monto, 0))}. Pendientes: ${pendientes.length} por ${fmtMoney(pendientes.reduce((s, c) => s + c.monto, 0))}.`);
if (avisos.length) {
  console.log(`\nAvisos (${avisos.length}): se carga igual, pero conviene revisarlos.`);
  for (const a of avisos) console.log(`  - ${a}`);
}
if (noInterpretado.length) {
  console.log(`\nLo que no se pudo interpretar del archivo original (${noInterpretado.length}):`);
  for (const n of noInterpretado) console.log(`  - ${n.fila != null ? `fila ${n.fila}: ` : ''}${n.motivo ?? JSON.stringify(n)}`);
}
if (errores.length) {
  console.log(`\nErrores (${errores.length}): no se cargó nada. Corrige el archivo y vuelve a correrlo.`);
  for (const e of errores) console.log(`  - ${e}`);
  process.exit(1);
}
if (probar) {
  console.log('\nModo prueba: no se cargó nada.');
  process.exit(0);
}

const db = conectar();
if (await hayDatos(db)) {
  if (reemplazar) {
    console.log('\nBorrando los datos que había...');
    await vaciarDatosDelNegocio(db);
  } else if (!agregar) {
    console.error('\nLa base ya tiene datos. Usa --reemplazar para borrarlos y cargar estos, o --agregar para sumarlos.');
    process.exit(1);
  }
}

try {
  await insertarEnLotes(db, 'alumnos', filas.alumnos);
  await insertarEnLotes(db, 'ventas', filas.ventas);
  await insertarEnLotes(db, 'cuotas', filas.cuotas);
} catch (e) {
  console.error(`\n${e.message}`);
  console.error('Deshaciendo lo que se alcanzó a cargar...');
  const ids = filas.alumnos.map((a) => a.id);
  for (let i = 0; i < ids.length; i += 200) await db.from('alumnos').delete().in('id', ids.slice(i, i + 200));
  process.exit(1);
}

console.log('\nCargado. Así quedó la base:');
await imprimirResumen(db);
