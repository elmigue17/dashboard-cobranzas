// Genera datos de EJEMPLO, todos inventados, con los programas, el equipo y la zona horaria de
// negocio.config.js. Nombres, emails (@ejemplo.com), teléfonos (con 555), usuarios de Instagram,
// conversaciones y montos son falsos.
//
// La semilla es fija: el mismo día y la misma configuración dan los mismos datos. Las fechas se arman
// alrededor de "hoy" en la zona horaria del negocio, así "Hoy", "Ayer", "Este mes" y la agenda de
// llamadas siempre tienen movimiento.
import {
  PROGRAMAS, EQUIPO, PORCENTAJES, COMISION_SOBRE, ZONA_HORARIA,
} from '../../src/config.js';
import { hoy as hoyEnZona, sumarMeses, sumarDias, diasEntre } from '../../src/fechas.js';
import { zonedTimeToUtc } from '../../src/timezone.js';
import { planDeCuotas } from '../../src/cuotas.js';
import { columnasComision } from '../../src/comisiones.js';

// ─── Azar con semilla ──────────────────────────────────────────────────────────────────────────
function mulberry32(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20261003);
const randint = (a, b) => a + Math.floor(random() * (b - a + 1));
const uniform = (a, b) => a + random() * (b - a);
const choice = (lista) => lista[Math.floor(random() * lista.length)];
const choices = (lista, pesos) => {
  const total = pesos.reduce((s, p) => s + p, 0);
  let r = random() * total;
  for (let i = 0; i < lista.length; i += 1) {
    r -= pesos[i];
    if (r < 0) return lista[i];
  }
  return lista[lista.length - 1];
};
const shuffle = (lista) => {
  for (let i = lista.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
};
const uuid = () => {
  const h = Array.from({ length: 32 }, () => Math.floor(random() * 16).toString(16));
  h[12] = '4';
  h[16] = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  const s = h.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
};
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// ─── Tiempo ────────────────────────────────────────────────────────────────────────────────────
const HOY = hoyEnZona();
const AHORA = new Date();
const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const pad = (n) => String(n).padStart(2, '0');

/** Fecha 'AAAA-MM-DD' + hora local del negocio -> Date. */
const momento = (fecha, hora = 12, minuto = 0) => zonedTimeToUtc(fecha, `${pad(hora)}:${pad(minuto)}:00`, ZONA_HORARIA);
const fechaDe = (instante) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instante);
const masTiempo = (instante, ms) => new Date(instante.getTime() + ms);
const limitar = (instante, minimo = null, maximo = AHORA) => {
  let t = instante.getTime();
  if (minimo && t < minimo.getTime()) t = minimo.getTime();
  if (maximo && t > maximo.getTime()) t = maximo.getTime();
  return new Date(t);
};
const horaComercial = () => [randint(10, 20), choice([0, 30])];
const horaRedes = () => [choices([...Array(24).keys()], [3, 2, 1, 1, 1, 1, 1, 2, 3, 4, 5, 5, 5, 5, 5, 6, 6, 6, 7, 8, 9, 9, 8, 5]), randint(0, 59)];

// ─── Configuración ─────────────────────────────────────────────────────────────────────────────
const programas = PROGRAMAS.length ? PROGRAMAS : [{ nombre: 'Programa', duracionMeses: 3, precio: 900, cuotas: 3 }];
const SETTERS = EQUIPO.setters.length ? EQUIPO.setters : ['Setter 1'];
const CLOSERS = EQUIPO.closers.length ? EQUIPO.closers : ['Closer 1'];
// Alguien que a veces trae el lead y lo cierra (cobra el % de "misma persona").
const SETTER_Y_CLOSER = CLOSERS.find((c) => SETTERS.includes(c)) || CLOSERS[CLOSERS.length - 1];

const precioDe = (p) => (p.precio > 0 ? p.precio : 500 * p.duracionMeses);
// Se venden más los programas baratos.
const pesoDe = (p) => 1 / Math.sqrt(precioDe(p));
const elegirPrograma = () => choices(programas, programas.map(pesoDe));
const programaMasLargo = [...programas].sort((a, b) => b.duracionMeses - a.duracionMeses || precioDe(b) - precioDe(a))[0];
const programaEnCuotas = programas.find((p) => p.cuotas > 1) || programas[0];

// ─── Personas inventadas ───────────────────────────────────────────────────────────────────────
const NOMBRES = [
  'Sofía', 'Mateo', 'Valentina', 'Santiago', 'Camila', 'Sebastián', 'Isabella', 'Matías', 'Lucía', 'Nicolás',
  'Martina', 'Diego', 'Emilia', 'Benjamín', 'Gabriel', 'Daniela', 'Andrés', 'Florencia', 'Tomás', 'Agustina',
  'Julián', 'Carolina', 'Emiliano', 'Antonella', 'Joaquín', 'Paula', 'Bruno', 'Victoria', 'Lautaro', 'Micaela',
  'Alejandro', 'Juliana', 'Franco', 'Natalia', 'Ezequiel', 'Mariana', 'Rodrigo', 'Gabriela', 'Maximiliano',
  'Fernanda', 'Leonardo', 'Ximena', 'Cristian', 'Rocío', 'Felipe', 'Abril', 'Gonzalo', 'Pilar', 'Manuel',
  'Jimena', 'Esteban', 'Luciana', 'Federico', 'Celeste', 'Hernán', 'Milagros', 'Ramiro', 'Bianca', 'Simón',
  'Carla', 'Iván', 'Noelia', 'Leandro', 'Kevin', 'Brenda', 'Marcos', 'Tamara', 'Elías', 'Belén', 'Thiago',
  'Lorena', 'Adrián', 'Jazmín', 'Ariana', 'Pablo', 'Sabrina', 'Eduardo', 'Romina', 'Hugo', 'Melina', 'Oscar', 'Nadia',
];
const APELLIDOS = [
  'Gómez', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Pérez', 'Sánchez', 'Romero', 'Torres', 'Álvarez',
  'Ruiz', 'Ramírez', 'Flores', 'Acosta', 'Benítez', 'Medina', 'Herrera', 'Aguirre', 'Castro', 'Ortiz', 'Molina',
  'Silva', 'Rojas', 'Morales', 'Vargas', 'Navarro', 'Cabrera', 'Ríos', 'Peralta', 'Sosa', 'Ibarra', 'Luna',
  'Mendoza', 'Salazar', 'Vera', 'Campos', 'Guzmán', 'Correa', 'Cáceres', 'Miranda', 'Ponce', 'Fuentes',
  'Escobar', 'Bravo', 'Arias', 'Valdez', 'Orozco', 'Montes', 'Toledo', 'Bustos', 'Godoy', 'Maldonado',
  'Figueroa', 'Palacios', 'Robles', 'Barrios', 'Quintero', 'Saavedra', 'Zamora', 'Espinoza', 'Pacheco',
  'Duarte', 'Rivas', 'Arce', 'Bermúdez', 'Soria', 'Tapia',
];
const sinTildes = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
const usados = { nombres: new Set(), igs: new Set(), emails: new Set() };

const telefono = () => choices([
  () => `+51 955 5${randint(10, 99)} ${randint(100, 999)}`,
  () => `+52 55 5555 ${randint(1000, 9999)}`,
  () => `+57 300 555 ${randint(1000, 9999)}`,
  () => `+56 9 5555 ${randint(1000, 9999)}`,
  () => `+593 99 555 ${randint(1000, 9999)}`,
  () => `+34 655 55${randint(10, 99)} ${randint(10, 99)}`,
], [24, 20, 16, 12, 12, 8])();

function usuarioIg(nombre, apellido) {
  const n = sinTildes(nombre).toLowerCase();
  const a = sinTildes(apellido).toLowerCase().replace(/\s/g, '');
  for (let i = 0; i < 80; i += 1) {
    const ig = choice([
      `${n}.${a}`, `${n}_${a}`, `${n}${a}${randint(1, 99)}`, `${n}.${a.slice(0, 4)}`, `soy.${n}${a[0]}`,
      `${a}.${n}`, `${n}${randint(90, 99)}${a.slice(0, 3)}`, `${n}.${a}.ok`, `${n}_${a[0]}${randint(1, 9)}`,
    ]);
    if (!usados.igs.has(ig)) {
      usados.igs.add(ig);
      return ig;
    }
  }
  throw new Error('No quedan usuarios de Instagram libres');
}

function email(nombre, apellido) {
  const base = `${sinTildes(nombre).toLowerCase()}.${sinTildes(apellido).toLowerCase().replace(/\s/g, '')}`;
  let candidato = `${base}@ejemplo.com`;
  while (usados.emails.has(candidato)) candidato = `${base}${randint(2, 99)}@ejemplo.com`;
  usados.emails.add(candidato);
  return candidato;
}

function persona(fija = null) {
  for (let i = 0; i < 1000; i += 1) {
    const [nombre, apellido] = fija || [choice(NOMBRES), choice(APELLIDOS)];
    const completo = `${nombre} ${apellido}`;
    if (usados.nombres.has(completo)) {
      if (fija) throw new Error(`Nombre fijo repetido: ${completo}`);
      continue;
    }
    usados.nombres.add(completo);
    return { nombre, apellido, completo, ig: usuarioIg(nombre, apellido), email: email(nombre, apellido), telefono: telefono() };
  }
  throw new Error('No se pudo inventar una persona');
}

// ─── Contenido ─────────────────────────────────────────────────────────────────────────────────
const TEMAS = {
  C: ['3 errores al empezar', 'cómo organizar tu semana', 'lo que nadie te cuenta', 'el plan de 30 días',
    'antes y después de un alumno', 'preguntas frecuentes', 'cómo elegir tu primer objetivo', 'el método paso a paso',
    'checklist para arrancar', 'mitos que te frenan', 'cómo medir tu avance', 'lo que haría si empezara hoy'],
  R: ['un día con un alumno', 'respuesta a un seguidor', 'el error más común', 'resultado en 60 segundos',
    'detrás de escena', 'caso de éxito', 'tip rápido', 'lo que cambió en 3 meses', 'cómo es una clase'],
  H: ['caja de preguntas', 'encuesta', 'testimonio', 'recurso gratis', 'cupos abiertos', 'pregunta del día', 'mini clase'],
};
const TIPO = { C: 'Carrusel', R: 'Reel', H: 'Historia' };
const tituloEnMayusculas = (t) => t.split(' ').map((p) => (p.length <= 4 && p === p.toUpperCase() ? p : p[0].toUpperCase() + p.slice(1))).join(' ');

const contenidos = [];
function generarContenido() {
  const ids = new Set();
  const temas = Object.fromEntries(Object.entries(TEMAS).map(([k, v]) => [k, shuffle([...v])]));
  for (let semana = 52; semana >= 0; semana -= 2) {
    for (const [letra, prob] of [['C', 0.75], ['R', 0.7], ['H', 0.35]]) {
      if (random() > prob) continue;
      const dia = sumarDias(HOY, -semana * 7 - randint(1, 6));
      if (dia >= HOY) continue;
      const id = `${letra}_${dia.slice(8, 10)}_${dia.slice(5, 7)}`;
      if (ids.has(id)) continue;
      ids.add(id);
      if (!temas[letra].length) temas[letra] = shuffle([...TEMAS[letra]]);
      const tema = temas[letra].pop();
      contenidos.push({ id, nombre: `${TIPO[letra]} ${tituloEnMayusculas(tema)} ${dia.slice(8, 10)}/${dia.slice(5, 7)}`, fecha: dia, link: random() < 0.8 ? `https://example.com/contenido/${id.toLowerCase()}` : null });
    }
  }
  contenidos.push({ id: 'NEW_FOLLOW', nombre: 'Nuevo Follow', fecha: sumarDias(HOY, -370), link: null });
  contenidos.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function piezasPara(instante) {
  if (random() < 0.05) return [];
  if (random() < 0.15) return ['NEW_FOLLOW'];
  const fecha = fechaDe(instante);
  const desde = sumarDias(fecha, -21);
  let candidatas = contenidos.filter((c) => c.id !== 'NEW_FOLLOW' && c.fecha <= fecha && c.fecha >= desde);
  if (!candidatas.length) candidatas = contenidos.filter((c) => c.id !== 'NEW_FOLLOW' && c.fecha <= fecha).slice(-3);
  if (!candidatas.length) return ['NEW_FOLLOW'];
  const pesos = candidatas.map((c) => Math.max(1, 1 + diasEntre(desde, c.fecha)));
  const elegidas = [choices(candidatas, pesos).id];
  if (random() < 0.2 && candidatas.length > 1) {
    const otra = choices(candidatas, pesos).id;
    if (!elegidas.includes(otra)) elegidas.push(otra);
  }
  return elegidas;
}

// ─── Alumnos, ventas y cuotas ──────────────────────────────────────────────────────────────────
const alumnos = [];

function equipo() {
  if (random() < 0.1) return [SETTER_Y_CLOSER, SETTER_Y_CLOSER];
  const setter = random() < 0.08 ? null : choices(SETTERS, SETTERS.map((_, i) => (i === 0 ? 55 : 45)));
  return [setter, choices(CLOSERS, CLOSERS.map((_, i) => (i === 0 ? 55 : 45)))];
}

function nuevaVenta(alumno, programa, ventaEn, inicio, { renovacion = false, monto = null, nCuotas = null, deposito = null } = {}) {
  const total = monto ?? (random() < 0.8 ? precioDe(programa) : Math.round((precioDe(programa) * 0.9) / 10) * 10);
  let n = nCuotas ?? (programa.cuotas > 1 ? choices([1, Math.max(2, programa.cuotas - 1), programa.cuotas], [30, 20, 50]) : 1);
  let pago = deposito;
  if (pago == null) {
    pago = 0;
    if (n > 1 && random() < 0.35) pago = Math.round((total * choice([0.2, 0.25, 0.3])) / 10) * 10;
    else if (n === 1 && random() < 0.6) pago = total;
  }
  if (n === 1 && pago > 0) pago = total;
  let resultado = planDeCuotas({ montoTotal: total, nCuotas: n, pagoEnLlamada: pago, fechaInicio: inicio });
  if (resultado.error) {
    n = Math.max(1, n);
    resultado = planDeCuotas({ montoTotal: total, nCuotas: n, pagoEnLlamada: 0, fechaInicio: inicio });
    pago = 0;
  }
  const venta = {
    id: uuid(),
    programa: programa.nombre,
    duracion: programa.duracionMeses,
    monto: total,
    ventaEn,
    inicio,
    fin: sumarMeses(inicio, programa.duracionMeses),
    renovacion,
    pagadoEnLlamada: pago > 0,
    cuotas: resultado.cuotas.map((c) => ({ ...c, estado: null, fechaPago: null, saldo: false, notas: null, fijo: false })),
  };
  alumno.ventas.push(venta);
  return venta;
}

function nuevoAlumno(ventaEn, inicio, programa, opciones = {}) {
  const p = persona(opciones.fija);
  const [setter, closer] = equipo();
  const alumno = {
    ...p, id: uuid(), setter, closer, ventas: [], estado: 'Activo', fechaBaja: null, congeladoDesde: null,
    diasCongelados: 0, demo: null, moroso: false, creado: ventaEn,
  };
  nuevaVenta(alumno, programa, ventaEn, inicio, opciones);
  alumnos.push(alumno);
  return alumno;
}

const VENTAS_POR_MES = [6, 7, 8, 9, 10, 11, 12, 12, 13, 14, 14, 15]; // del mes -12 al mes -1

function generarAlumnos() {
  const mesActual = `${HOY.slice(0, 7)}-01`;
  VENTAS_POR_MES.forEach((cantidad, i) => {
    const primero = sumarMeses(mesActual, i - 12);
    for (let k = 0; k < cantidad; k += 1) {
      const dia = sumarDias(primero, randint(0, 27));
      const venta = momento(dia, ...horaComercial());
      nuevoAlumno(venta, sumarDias(dia, choice([0, 0, 0, 1, 2, 3, 5, 7])), elegirPrograma());
    }
  });
  // Ventas de este mes, hasta hoy (incluida una de hoy a la mañana).
  const diasDelMes = diasEntre(mesActual, HOY);
  for (let k = 0; k < Math.max(2, Math.round(diasDelMes / 3)); k += 1) {
    const dia = sumarDias(mesActual, randint(0, Math.max(0, diasDelMes - 1)));
    const programa = programaEnCuotas;
    nuevoAlumno(momento(dia, ...horaComercial()), sumarDias(dia, choice([0, 2, 5])), programa, { nCuotas: programa.cuotas });
  }
  const deHoy = nuevoAlumno(limitar(momento(HOY, 9, 40)), HOY, programaEnCuotas, { nCuotas: programaEnCuotas.cuotas });
  [deHoy.setter, deHoy.closer] = [SETTERS[0], CLOSERS[0]];
  deHoy.ventaHoy = true;
  // Vendidos estos días, pero arrancan con la próxima cohorte.
  for (const [diasAtras, diasAlInicio] of [[6, 16], [3, 30], [1, 44], [2, 59]]) {
    const dia = sumarDias(HOY, -diasAtras);
    const programa = elegirPrograma();
    const a = nuevoAlumno(momento(dia, ...horaComercial()), sumarDias(HOY, diasAlInicio), programa, { nCuotas: Math.max(2, programa.cuotas) });
    a.cohorteFutura = true;
  }
}

// Tres alumnos preparados para probar "Registrar pago" (ver docs/GUIA.md).
function generarAlumnosDemo() {
  const p0 = programaEnCuotas;
  const pMenos = { ...p0 };
  const pSaldo = programaMasLargo;
  const conTres = (p) => ({ ...p, cuotas: 3 });
  const a = nuevoAlumno(momento(sumarDias(HOY, -25), 16, 0), sumarDias(HOY, -25), conTres(pMenos), { fija: ['Mariana', 'Quiroga'], monto: precioDe(pMenos), nCuotas: 3, deposito: 0 });
  a.demo = 'menos';
  const b = nuevoAlumno(momento(sumarDias(HOY, -15), 18, 30), sumarDias(HOY, -13), conTres(p0), { fija: ['Esteban', 'Villalobos'], monto: precioDe(p0), nCuotas: 3, deposito: Math.round(precioDe(p0) / 3) });
  b.demo = 'mas';
  const c = nuevoAlumno(momento(sumarMeses(sumarDias(HOY, -2), -2), 11, 0), sumarMeses(sumarDias(HOY, 6), -2), conTres(pSaldo), { fija: ['Paula', 'Cifuentes'], monto: precioDe(pSaldo), nCuotas: 3, deposito: 0 });
  c.demo = 'saldo';
  [a.setter, a.closer] = [SETTERS[SETTERS.length - 1], CLOSERS[0]];
  [b.setter, b.closer] = [SETTERS[0], CLOSERS[CLOSERS.length - 1]];
  [c.setter, c.closer] = [SETTERS[SETTERS.length - 1], CLOSERS[CLOSERS.length - 1]];
  for (const alumno of [a, b, c]) {
    const venta = alumno.ventas[0];
    for (const cuota of venta.cuotas) {
      cuota.fijo = true;
      if (cuota.pagada || cuota.fecha_vencimiento < HOY) {
        cuota.estado = 'Pagado';
        cuota.fechaPago = cuota.pagada ? fechaDe(venta.ventaEn) : sumarDias(cuota.fecha_vencimiento, choice([0, 1]));
      } else {
        cuota.estado = 'Pendiente';
      }
    }
  }
}

function generarRenovaciones() {
  const candidatos = shuffle(alumnos.filter((a) => !a.demo && !a.cohorteFutura && !a.ventaHoy
    && a.ventas[0].duracion > 1 && a.ventas[0].fin >= sumarDias(HOY, -240) && a.ventas[0].fin <= sumarDias(HOY, 100)));
  const pasadas = candidatos.filter((a) => a.ventas[0].fin <= HOY).slice(0, 11);
  const futuras = candidatos.filter((a) => a.ventas[0].fin > HOY).slice(0, 4);
  for (const alumno of [...pasadas, ...futuras]) {
    const anterior = alumno.ventas[alumno.ventas.length - 1];
    const inicio = anterior.fin;
    const programaAnterior = programas.find((p) => p.nombre === anterior.programa) || programas[0];
    const programa = random() < 0.6 ? programaAnterior : elegirPrograma();
    const venta = inicio > HOY
      ? momento(sumarDias(HOY, -randint(1, 20)), ...horaComercial())
      : momento(sumarDias(inicio, -randint(0, 6)), ...horaComercial());
    nuevaVenta(alumno, programa, limitar(venta), inicio, { renovacion: true, nCuotas: inicio > HOY ? Math.max(2, programa.cuotas) : null });
  }
}

const finEfectivo = (a) => sumarDias(a.ventas[a.ventas.length - 1].fin, a.diasCongelados);

function decidirCicloDeVida() {
  const libres = alumnos.filter((a) => !a.demo && !a.ventaHoy && !a.cohorteFutura);
  // Bajas: abandonan entre 2 y 10 semanas después de empezar; lo que quedaba por pagar es incobrable.
  const posibles = shuffle(libres.filter((a) => a.ventas.length === 1 && a.ventas[0].duracion > 1
    && a.ventas[0].inicio >= sumarDias(HOY, -280) && a.ventas[0].inicio <= sumarDias(HOY, -40)));
  for (const a of posibles.slice(0, 11)) {
    const baja = sumarDias(a.ventas[0].inicio, randint(15, 70));
    a.fechaBaja = baja < sumarDias(HOY, -4) ? baja : sumarDias(HOY, -4);
    a.estado = 'Churneado';
  }
  // Congelados hoy.
  const congelables = shuffle(libres.filter((a) => !a.fechaBaja && a.ventas[a.ventas.length - 1].fin > sumarDias(HOY, 25)
    && a.ventas[a.ventas.length - 1].inicio < sumarDias(HOY, -10)));
  for (const a of congelables.slice(0, 6)) {
    a.congeladoDesde = sumarDias(HOY, -randint(4, 35));
    a.estado = 'Pausado';
    if (random() < 0.3) a.diasCongelados = randint(7, 14);
  }
  // Congelamientos ya terminados: la fecha de fin se corrió esos días.
  for (const a of libres) if (!a.fechaBaja && !a.congeladoDesde && random() < 0.1) a.diasCongelados = randint(7, 21);
  // Morosos: una cuota vencida que todavía no pagaron.
  const morosos = shuffle(libres.filter((a) => !a.fechaBaja && a.ventas.some((v) => v.cuotas.some((c) => !c.pagada
    && c.fecha_vencimiento >= sumarDias(HOY, -60) && c.fecha_vencimiento <= sumarDias(HOY, -4)))));
  for (const a of morosos.slice(0, 7)) a.moroso = true;
}

function decidirCuotas() {
  for (const a of alumnos) {
    let pendienteMoroso = null;
    if (a.moroso) {
      const vencidas = a.ventas.flatMap((v) => v.cuotas.filter((c) => !c.pagada
        && c.fecha_vencimiento >= sumarDias(HOY, -60) && c.fecha_vencimiento <= sumarDias(HOY, -4)));
      pendienteMoroso = vencidas[vencidas.length - 1] || null;
    }
    for (const v of a.ventas) {
      for (const c of v.cuotas) {
        if (c.fijo) continue;
        if (c.pagada) {
          c.estado = 'Pagado';
          c.fechaPago = fechaDe(v.ventaEn);
        } else if (a.fechaBaja && c.fecha_vencimiento > a.fechaBaja) {
          c.estado = 'Incobrable';
        } else if (c.fecha_vencimiento <= HOY) {
          if (c === pendienteMoroso) {
            c.estado = 'Pendiente';
          } else {
            const pago = sumarDias(c.fecha_vencimiento, choice([-3, -2, -1, 0, 0, 0, 0, 1, 1, 2, 3, 5, 7]));
            c.estado = 'Pagado';
            c.fechaPago = [pago, fechaDe(v.ventaEn), HOY].sort()[1]; // entre la venta y hoy
          }
        } else {
          const pronto = c.fecha_vencimiento <= sumarDias(HOY, 10);
          if (random() < (pronto ? 0.15 : 0.04)) {
            c.estado = 'Pagado'; // pagó por adelantado
            const pago = sumarDias(HOY, -randint(0, 5));
            c.fechaPago = pago < fechaDe(v.ventaEn) ? fechaDe(v.ventaEn) : pago;
          } else {
            c.estado = 'Pendiente';
          }
        }
      }
    }
  }
}

// Historial con pagos de menos o de más ya recalculados, y cuotas de saldo, como los deja la app.
function casosParciales() {
  const libres = shuffle(alumnos.filter((a) => !a.demo && !a.fechaBaja));
  let menos = 0; let mas = 0; let saldos = 0;
  for (const a of libres) {
    const v = a.ventas[0];
    const cs = v.cuotas;
    if (cs.length === 3 && cs[1].estado === 'Pagado' && cs[2].estado === 'Pendiente' && !cs[1].fijo && (menos < 3 || mas < 1)) {
      const delta = Math.min(choice([50, 100, 150]), Math.floor(cs[2].monto / 2));
      if (menos < 3) {
        cs[1].monto = r2(cs[1].monto - delta);
        cs[2].monto = r2(cs[2].monto + delta);
        menos += 1;
      } else {
        cs[1].monto = r2(cs[1].monto + delta);
        cs[2].monto = r2(cs[2].monto - delta);
        mas += 1;
      }
      cs[1].fijo = true;
      cs[2].fijo = true;
      continue;
    }
    const ultima = cs[cs.length - 1];
    if (saldos < 3 && cs.length >= 2 && ultima.estado === 'Pagado' && !ultima.fijo && ultima.monto > 300) {
      const delta = choice([80, 120, 200]);
      ultima.monto = r2(ultima.monto - delta);
      ultima.fijo = true;
      const vence = sumarMeses(ultima.fechaPago, 1);
      const saldo = {
        n_cuota: ultima.n_cuota + 1, monto: delta, fecha_vencimiento: vence, estado: 'Pendiente', fechaPago: null,
        saldo: true, notas: `Saldo del pago parcial de la cuota ${ultima.n_cuota}.`, fijo: true,
      };
      if (vence <= HOY) {
        saldo.estado = 'Pagado';
        const pago = sumarDias(vence, randint(-2, 3));
        saldo.fechaPago = pago > HOY ? HOY : pago;
      }
      cs.push(saldo);
      saldos += 1;
    }
    if (menos >= 3 && mas >= 1 && saldos >= 3) break;
  }
}

// Que en el mes pasado y en este haya cuotas cobradas de alumnos que la misma persona trajo y cerró.
function asegurarMismaPersona() {
  const mesActual = HOY.slice(0, 7);
  const mesPasado = sumarMeses(`${mesActual}-01`, -1).slice(0, 7);
  for (const [mes, minimo] of [[mesPasado, 3], [mesActual, 1]]) {
    const cobradas = (a) => a.ventas.some((v) => v.cuotas.some((c) => c.estado === 'Pagado' && c.fechaPago?.slice(0, 7) === mes));
    const actuales = alumnos.filter((a) => a.setter === SETTER_Y_CLOSER && a.closer === SETTER_Y_CLOSER && cobradas(a));
    const faltan = minimo - actuales.length;
    if (faltan <= 0) continue;
    const posibles = shuffle(alumnos.filter((a) => a.setter !== SETTER_Y_CLOSER && !a.demo && !a.ventaHoy && cobradas(a)));
    for (const a of posibles.slice(0, faltan)) {
      a.setter = SETTER_Y_CLOSER;
      a.closer = SETTER_Y_CLOSER;
    }
  }
}

// ─── Llamadas y leads ──────────────────────────────────────────────────────────────────────────
const llamadas = [];
const leads = [];

const DOLORES = [
  'Quiere resultados pero no sabe por dónde empezar.', 'Ya probó solo y no avanzó; busca acompañamiento.',
  'No tiene tiempo y necesita algo ordenado.', 'Quiere cambiar de trabajo en los próximos meses.',
  'Le escribe mucha gente pero no sabe cómo seguir.', 'Perdió constancia y quiere retomar.',
  'Necesita un plan claro con fechas.', 'Siente que se estancó y quiere dar el salto.',
];
const INGRESOS = ['Sin ingresos propios todavía', 'Menos de USD 500 al mes', 'USD 500 a 1.000 al mes', 'USD 1.000 a 3.000 al mes', 'Más de USD 3.000 al mes'];
const CAPACIDAD = ['Puede invertir sin problema', 'Necesita pagar en cuotas', 'Tiene ahorros para invertir', 'Tiene tarjeta de crédito disponible', 'Lo decide con su pareja', 'Hoy no tiene cómo invertir'];

function nuevaLlamada(p, cuando, closer, estado, resultado = null, calificada = null, agendadaEn = null) {
  const llamada = {
    id: uuid(), persona: p, cuando, closer, estado, resultado, calificada,
    agendadaEn: agendadaEn || masTiempo(cuando, -(randint(1, 6) * DIA + randint(0, 10) * HORA)),
    dolores: random() < 0.85 ? choice(DOLORES) : null,
    ingresos: random() < 0.85 ? choice(INGRESOS) : null,
    capacidad: random() < 0.8 ? choice(CAPACIDAD) : null,
    enlace: `https://example.com/llamada/${uuid().slice(0, 10)}`,
    leadId: null,
  };
  llamadas.push(llamada);
  return llamada;
}

const resultadoPresentada = () => {
  const r = choices(['Seguimiento', 'No califica financiero', 'No es el momento', 'Perdido'], [25, 20, 30, 25]);
  const prob = { Seguimiento: 0.8, 'No califica financiero': 0.05, 'No es el momento': 0.55, Perdido: 0.3 }[r];
  return [r, random() < prob];
};

function nuevoLead(p, creado, setter) {
  const lead = { id: uuid(), persona: p, creado, setter, eventos: [], toques: [creado], piezas: piezasPara(creado), idExterno: String(randint(100000000, 999999999)) };
  leads.push(lead);
  return lead;
}

function cambiar(lead, cuando, nuevo) {
  const anterior = lead.eventos.length ? lead.eventos[lead.eventos.length - 1][2] : 'frio';
  if (anterior === nuevo) return;
  const minimo = masTiempo(lead.eventos.length ? lead.eventos[lead.eventos.length - 1][0] : lead.creado, MINUTO);
  const t = limitar(cuando, minimo);
  lead.eventos.push([t, anterior, nuevo]);
  lead.toques.push(t);
}

const estadoActual = (lead, hasta = null) => lead.eventos.reduce((e, [t, , nuevo]) => (!hasta || t <= hasta ? nuevo : e), 'frio');

function leadParaLlamada(llamada, setter) {
  const creado = masTiempo(llamada.agendadaEn, -uniform(1, 20) * DIA);
  const lead = nuevoLead(llamada.persona, creado, setter);
  llamada.leadId = lead.id;
  const span = llamada.agendadaEn.getTime() - creado.getTime();
  cambiar(lead, new Date(creado.getTime() + span * uniform(0.05, 0.3)), 'en_conversacion');
  cambiar(lead, new Date(creado.getTime() + span * uniform(0.4, 0.9)), 'interesado');
  cambiar(lead, llamada.agendadaEn, 'agendado');
  if (llamada.cuando <= AHORA && llamada.estado !== 'Agendada') {
    const despues = masTiempo(llamada.cuando, randint(20, 90) * MINUTO);
    const r = llamada.resultado;
    if (r === 'Cierre') cambiar(lead, despues, 'cerrado');
    else if (r === 'No califica financiero' || r === 'Perdido') cambiar(lead, masTiempo(llamada.cuando, uniform(0.1, 4) * DIA), 'perdido');
    else if (r === 'No es el momento') cambiar(lead, despues, choice(['perdido', 'en_conversacion']));
    else if (r === 'Seguimiento') cambiar(lead, despues, choice(['interesado', 'agendado']));
    else if (llamada.estado === 'No asistió') cambiar(lead, despues, choices(['agendado', 'interesado', 'perdido'], [40, 30, 30]));
    else cambiar(lead, despues, choice(['interesado', 'perdido']));
    lead.toques.push(limitar(despues));
  }
  return lead;
}

const setterPara = (closer) => (closer === SETTER_Y_CLOSER && random() < 0.12 ? SETTER_Y_CLOSER : choice(SETTERS));

function generarLlamadasYLeads() {
  // Llamadas de cierre de una parte de los alumnos.
  for (const a of alumnos) {
    const v = a.ventas[0];
    const especial = a.demo || a.ventaHoy || a.cohorteFutura || fechaDe(v.ventaEn) >= sumarDias(HOY, -5);
    if (!especial && random() > 0.3) continue;
    const llamada = nuevaLlamada(a, v.ventaEn, a.closer, 'Presentada', 'Cierre', true);
    if (fechaDe(v.ventaEn) >= sumarDias(HOY, -330) && (especial || random() < 0.6)) leadParaLlamada(llamada, a.setter);
  }
  // Llamadas que no terminaron en venta, creciendo mes a mes.
  const mesActual = `${HOY.slice(0, 7)}-01`;
  [7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 20, 24].forEach((cantidad, i) => {
    const primero = sumarMeses(mesActual, i - 12);
    for (let k = 0; k < cantidad; k += 1) {
      const cuando = momento(sumarDias(primero, randint(0, 27)), ...horaComercial());
      const estado = choices(['Presentada', 'No asistió', 'Cancelada'], [62, 25, 13]);
      const [resultado, calificada] = estado === 'Presentada' ? resultadoPresentada() : [null, null];
      const llamada = nuevaLlamada(persona(), cuando, choice(CLOSERS), estado, resultado, calificada);
      if (random() < 0.45) leadParaLlamada(llamada, setterPara(llamada.closer));
    }
  });
  // Este mes, antes de hoy.
  for (let k = 0; k < Math.max(0, diasEntre(mesActual, HOY)); k += 2) {
    const cuando = momento(sumarDias(mesActual, k), ...horaComercial());
    const estado = choices(['Presentada', 'No asistió', 'Cancelada'], [62, 25, 13]);
    const [resultado, calificada] = estado === 'Presentada' ? resultadoPresentada() : [null, null];
    leadParaLlamada(nuevaLlamada(persona(), cuando, choice(CLOSERS), estado, resultado, calificada), choice(SETTERS));
  }
  // Hoy: algunas ya pasaron y otras todavía no.
  for (const [hora, minuto, estado, resultado, calificada] of [
    [9, 0, 'No asistió', null, null], [10, 0, 'Presentada', 'Seguimiento', true], [11, 15, 'Presentada', 'No es el momento', true],
    [15, 0, 'Agendada', null, null], [18, 30, 'Agendada', null, null], [20, 0, 'Agendada', null, null],
  ]) {
    const cuando = momento(HOY, hora, minuto);
    const pasada = cuando <= AHORA;
    const llamada = nuevaLlamada(persona(), cuando, choice(CLOSERS), pasada ? estado : 'Agendada', pasada ? resultado : null, pasada ? calificada : null,
      limitar(masTiempo(AHORA, -uniform(1, 5) * DIA)));
    leadParaLlamada(llamada, choice(SETTERS));
  }
  // Próximos días: agenda con llamadas reservadas.
  for (const [dias, cantidad] of [[1, 4], [2, 2], [3, 2], [4, 3], [5, 2], [6, 1], [7, 2]]) {
    for (let k = 0; k < cantidad; k += 1) {
      const llamada = nuevaLlamada(persona(), momento(sumarDias(HOY, dias), ...horaComercial()), choice(CLOSERS), 'Agendada', null, null,
        limitar(masTiempo(AHORA, -uniform(0, 5) * DIA), null, masTiempo(AHORA, -30 * MINUTO)));
      if (random() < 0.85) leadParaLlamada(llamada, choice(SETTERS));
    }
  }
}

function estadoPorAntiguedad(dias) {
  if (dias < 1) return choices(['frio', 'en_conversacion', 'interesado'], [60, 35, 5]);
  if (dias <= 3) return choices(['frio', 'en_conversacion', 'interesado', 'perdido'], [35, 40, 15, 10]);
  if (dias <= 30) return choices(['frio', 'en_conversacion', 'interesado', 'perdido'], [30, 30, 15, 25]);
  return choices(['frio', 'en_conversacion', 'interesado', 'perdido'], [35, 15, 8, 42]);
}

function recorridoSuelto(lead, final) {
  if (final === 'frio') return;
  const c = lead.creado;
  const hasta = (desde, ms) => new Date(Math.min(desde.getTime() + ms, AHORA.getTime()));
  if (final === 'perdido' && random() < 0.4) {
    cambiar(lead, hasta(c, uniform(0.2, 6) * DIA), 'perdido');
    return;
  }
  const t1 = hasta(c, uniform(0.1, 20) * HORA);
  cambiar(lead, t1, 'en_conversacion');
  if (final === 'interesado' || (final === 'perdido' && random() < 0.3)) cambiar(lead, hasta(t1, uniform(0.1, 6) * DIA), 'interesado');
  const ultimo = lead.eventos[lead.eventos.length - 1][0];
  if (final === 'perdido') {
    cambiar(lead, hasta(ultimo, uniform(1, 10) * DIA), 'perdido');
    return;
  }
  // Algunos siguen hablando; otros quedaron colgados (seguimientos abandonados).
  lead.toques.push(random() < 0.45
    ? new Date(ultimo.getTime() + (AHORA.getTime() - ultimo.getTime()) * uniform(0.6, 1))
    : hasta(ultimo, uniform(0.2, 8) * DIA));
}

function generarLeadsSueltos(total = 320) {
  const plan = [[HOY, 9], [sumarDias(HOY, -1), 7]];
  for (let d = 2; d < 30; d += 1) plan.push([sumarDias(HOY, -d), randint(1, 4)]);
  const recientes = plan.reduce((s, [, n]) => s + n, 0);
  const viejos = Math.max(total - leads.length - recientes, 0);
  const inicio = sumarDias(HOY, -330);
  const diasViejos = diasEntre(inicio, sumarDias(HOY, -30));
  for (let k = 0; k < viejos; k += 1) plan.push([sumarDias(inicio, Math.floor(random() ** 0.6 * diasViejos)), 1]);
  for (const [dia, cantidad] of plan) {
    for (let k = 0; k < cantidad; k += 1) {
      const creado = dia === HOY
        ? limitar(momento(HOY, randint(0, 11), randint(0, 59)), null, masTiempo(AHORA, -5 * MINUTO))
        : momento(dia, ...horaRedes());
      const final = estadoPorAntiguedad((AHORA - creado) / DIA);
      const setter = final === 'frio' && random() < 0.5 ? null : choice(SETTERS);
      recorridoSuelto(nuevoLead(persona(), creado, setter), final);
    }
  }
}

// Leads que vienen de antes y hoy volvieron a hablar, para que "Hoy" tenga movimiento.
function movimientoDeHoy() {
  const inicioHoy = momento(HOY, 0, 0);
  const vivos = shuffle(leads.filter((l) => l.creado < inicioHoy && ['en_conversacion', 'interesado', 'agendado'].includes(estadoActual(l))
    && l.creado > masTiempo(AHORA, -45 * DIA)));
  for (const lead of vivos.slice(0, 15)) {
    const ultimo = new Date(Math.max(...lead.toques.map((t) => t.getTime())));
    lead.toques.push(limitar(momento(HOY, randint(0, 11), randint(0, 59)), masTiempo(ultimo, MINUTO), masTiempo(AHORA, -3 * MINUTO)));
  }
  for (const lead of vivos.slice(0, 15).filter((l) => estadoActual(l) === 'en_conversacion').slice(0, 3)) {
    const ultimo = new Date(Math.max(...lead.toques.map((t) => t.getTime())));
    cambiar(lead, limitar(masTiempo(ultimo, 2 * MINUTO), null, masTiempo(AHORA, -MINUTO)), 'interesado');
  }
  for (const lead of vivos.slice(15, 27)) {
    const t = momento(sumarDias(HOY, -1), ...horaRedes());
    if (t > new Date(Math.max(...lead.toques.map((x) => x.getTime())))) lead.toques.push(t);
  }
}

function contexto(lead) {
  const p = lead.persona;
  const setter = lead.setter || 'Equipo';
  const final = estadoActual(lead);
  const pieza = contenidos.find((c) => lead.piezas.includes(c.id) && c.id !== 'NEW_FOLLOW');
  const tema = pieza ? pieza.nombre.replace(/ \d{2}\/\d{2}$/, '').split(' ').slice(1).join(' ').toLowerCase() : null;
  const lineas = [tema
    ? choice([`Lead: Hola! Vi tu publicación sobre ${tema} y me quedé pensando.`, `Lead: Hola, me llegó lo de ${tema}. ¿Cómo funciona el programa?`, `Lead: Buenas! Comenté por lo de ${tema}, quería más info.`])
    : choice(['Lead: Hola! Quería info del programa.', 'Lead: Hola, te sigo hace poco y me interesa lo que enseñas.', 'Lead: Buenas! ¿Cómo hago para empezar?'])];
  lineas.push('Bot: Mensaje automático con el recurso gratuito enviado.');
  if (final === 'frio') return lineas.join('\n');
  lineas.push(`${setter}: ¡Hola ${p.nombre}! Gracias por escribir. Cuéntame, ¿qué te gustaría lograr y en qué punto estás hoy?`);
  lineas.push('Lead: ' + choice(['Hace tiempo quiero empezar pero no me organizo.', 'Ya probé por mi cuenta y no avancé mucho.', 'Estoy empezando de cero.', 'Tengo algo de experiencia pero me estanqué.']));
  lineas.push(`${setter}: ` + choice(['Perfecto. ¿Qué te gustaría tener resuelto en tres meses?', 'Entiendo. ¿Qué es lo que más te frena hoy?', 'Buenísimo. ¿Cuánto tiempo a la semana le puedes dedicar?']));
  if (final === 'en_conversacion') {
    lineas.push('Lead: ' + choice(['Lo pienso y te cuento.', 'Me cuesta la constancia, sobre todo eso.', 'Quiero algo con un plan claro.']));
    return lineas.join('\n');
  }
  lineas.push('Lead: Quiero un plan claro y alguien que me acompañe.');
  lineas.push(`${setter}: Te paso un video corto donde explicamos cómo trabajamos. Míralo y me cuentas qué te pareció.`);
  if (final === 'perdido') {
    lineas.push('Lead: ' + choice(['Ahora no tengo presupuesto, más adelante te escribo.', 'Gracias, por ahora no me interesa.', 'Lo veo y te aviso.']));
    if (random() < 0.5) lineas.push('Nota: no respondió después de tres seguimientos.');
    return lineas.join('\n');
  }
  lineas.push('Lead: Lo vi, me interesa. ¿Cuánto cuesta?');
  lineas.push(`${setter}: Eso lo vemos en una llamada de 30 minutos con el equipo. ¿Te queda bien esta semana?`);
  if (final === 'interesado') return lineas.join('\n');
  lineas.push('Lead: Listo, ya reservé el horario.');
  if (final === 'cerrado') lineas.push('Nota: cerró en la llamada. Ya está cargado como alumno.');
  return lineas.join('\n');
}

// ─── Filas para la base ────────────────────────────────────────────────────────────────────────
function materializar() {
  const filas = { contenidos: [], leads: [], lead_contenidos: [], lead_eventos: [], llamadas: [], alumnos: [], ventas: [], cuotas: [] };
  const ids = new Set(contenidos.map((c) => c.id));
  for (const c of contenidos) filas.contenidos.push({ id: c.id, nombre: c.nombre, fecha: c.fecha, link: c.link });

  for (const lead of leads) {
    const piezas = lead.piezas.filter((id) => ids.has(id));
    const ultima = new Date(Math.max(...lead.toques.map((t) => t.getTime())));
    filas.leads.push({
      id: lead.id, created_at: lead.creado.toISOString(), usuario: lead.persona.ig, estado: estadoActual(lead),
      setter: lead.setter, ultima_interaccion: limitar(ultima).toISOString(), contexto: contexto(lead),
      link_conversacion: `https://example.com/conversacion/${lead.idExterno}`, id_externo: lead.idExterno,
    });
    piezas.forEach((id, i) => filas.lead_contenidos.push({
      lead_id: lead.id, contenido_id: id,
      created_at: (i === 0 ? lead.creado : limitar(masTiempo(lead.creado, randint(1, 48) * HORA), null, ultima)).toISOString(),
    }));
    for (const [t, anterior, nuevo] of lead.eventos) {
      filas.lead_eventos.push({ id: uuid(), lead_id: lead.id, estado_anterior: anterior, estado_nuevo: nuevo, created_at: t.toISOString() });
    }
  }

  for (const ll of [...llamadas].sort((a, b) => a.cuando - b.cuando)) {
    filas.llamadas.push({
      id: ll.id, created_at: ll.agendadaEn.toISOString(), lead_id: ll.leadId, nombre: ll.persona.completo,
      instagram: ll.persona.ig, email: ll.persona.email, telefono: ll.persona.telefono,
      fecha_llamada: ll.cuando.toISOString(), enlace: ll.enlace, ingresos_actuales: ll.ingresos, dolores: ll.dolores,
      capacidad_economica: ll.capacidad, estado: ll.estado, resultado: ll.resultado, calificada: ll.calificada, closer: ll.closer,
    });
  }

  const mesActual = HOY.slice(0, 7);
  const comisionGuardada = (fecha) => fecha && fecha.slice(0, 7) < sumarMeses(`${mesActual}-01`, -1).slice(0, 7);
  for (const a of alumnos) {
    const ultima = a.ventas[a.ventas.length - 1];
    for (const v of a.ventas) {
      const venta = {
        id: v.id, created_at: v.ventaEn.toISOString(), alumno_id: a.id, programa: v.programa, monto: v.monto,
        fecha_venta: fechaDe(v.ventaEn), fecha_inicio: v.inicio, fecha_fin: v.fin, n_cuotas: v.cuotas.filter((c) => !c.saldo).length,
        setter: a.setter, closer: a.closer, es_renovacion: v.renovacion, comision_setter: null, comision_closer: null,
      };
      // Las comisiones de los meses ya cerrados figuran guardadas; las del mes pasado y este, no.
      if (COMISION_SOBRE === 'vendido' && comisionGuardada(venta.fecha_venta)) Object.assign(venta, columnasComision(venta, PORCENTAJES));
      filas.ventas.push(venta);
      for (const c of v.cuotas) {
        const cuota = {
          id: uuid(), created_at: v.ventaEn.toISOString(), venta_id: v.id, alumno_id: a.id, n_cuota: c.n_cuota, monto: c.monto,
          fecha_vencimiento: c.fecha_vencimiento, fecha_pago: c.estado === 'Pagado' ? c.fechaPago : null, estado: c.estado,
          setter: a.setter, closer: a.closer, comision_setter: null, comision_closer: null, notas: c.notas,
        };
        if (COMISION_SOBRE === 'cobrado' && cuota.estado === 'Pagado' && comisionGuardada(cuota.fecha_pago)) Object.assign(cuota, columnasComision(cuota, PORCENTAJES));
        filas.cuotas.push(cuota);
      }
    }
    filas.alumnos.push({
      id: a.id, created_at: a.creado.toISOString(), nombre: a.completo, email: a.email, telefono: a.telefono,
      programa: ultima.programa, estado: a.estado, fecha_inicio: ultima.inicio, fecha_fin: finEfectivo(a), duracion_meses: ultima.duracion,
      fecha_baja: a.fechaBaja, congelado_desde: a.congeladoDesde, dias_congelados: a.diasCongelados, setter: a.setter, closer: a.closer,
    });
  }
  return filas;
}

export function generarDatosDeEjemplo() {
  generarContenido();
  generarAlumnos();
  generarAlumnosDemo();
  generarRenovaciones();
  decidirCicloDeVida();
  decidirCuotas();
  casosParciales();
  asegurarMismaPersona();
  generarLlamadasYLeads();
  generarLeadsSueltos();
  movimientoDeHoy();
  const filas = materializar();
  const demo = alumnos.filter((a) => a.demo).map((a) => ({
    nombre: a.completo,
    caso: a.demo,
    pendientes: a.ventas[0].cuotas.filter((c) => c.estado === 'Pendiente').map((c) => ({ n: c.n_cuota, monto: c.monto, vence: c.fecha_vencimiento })),
  }));
  return { filas, demo, hoy: HOY };
}
