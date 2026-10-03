// Plan de cuotas de una venta y recálculo cuando alguien paga de menos o de más.
// Sin React ni Supabase: se prueba con `npm test`.
import { sumarMeses } from './fechas.js';

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Reparte `total` en `n` partes iguales. Los centavos que sobran van a la última: 1000 / 3 = 333.33, 333.33, 333.34. */
export function repartir(total, n) {
  if (n <= 0) return [];
  const cada = r2(total / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? r2(total - cada * (n - 1)) : cada));
}

/**
 * Cuotas de una venta nueva. Si pagó algo en la llamada, esa es la cuota 1 (ya pagada) y el resto
 * se reparte en las demás. La cuota i vence i meses después de la fecha de inicio.
 * Devuelve { cuotas: [{ n_cuota, monto, fecha_vencimiento, pagada }] } o { error }.
 */
export function planDeCuotas({ montoTotal, nCuotas, pagoEnLlamada = 0, fechaInicio }) {
  const total = r2(montoTotal);
  const n = Math.round(Number(nCuotas));
  const pago = r2(pagoEnLlamada || 0);
  if (!(total > 0)) return { error: 'El monto total tiene que ser mayor que cero.' };
  if (!(n >= 1)) return { error: 'Tiene que haber al menos 1 cuota.' };
  if (pago < 0) return { error: 'Lo pagado en la llamada no puede ser negativo.' };
  if (pago > total) return { error: 'Lo pagado en la llamada no puede ser más que el monto total.' };
  if (n === 1 && pago > 0 && pago !== total) {
    return { error: 'Con 1 sola cuota, lo pagado en la llamada tiene que ser el total. Si pagó una parte, pon 2 cuotas o más.' };
  }
  if (pago > 0 && n > 1 && pago === total) {
    return { error: 'Pagó el total en la llamada: pon 1 cuota.' };
  }
  const montos = pago > 0 ? [pago, ...repartir(total - pago, n - 1)] : repartir(total, n);
  return {
    cuotas: montos.map((monto, i) => ({
      n_cuota: i + 1,
      monto,
      fecha_vencimiento: sumarMeses(fechaInicio, i),
      pagada: i === 0 && pago > 0,
    })),
  };
}

/**
 * Qué cambia cuando se registra el pago de `cuota` por `montoPagado`.
 *
 * - Pagó lo justo: nada más.
 * - Pagó de menos o de más y a la venta le quedan otras cuotas pendientes: la diferencia se reparte
 *   en partes iguales entre esas cuotas (solo las de la misma venta).
 * - Pagó de menos y no le quedan cuotas: se crea una cuota nueva por el saldo, a un mes del pago.
 * - Pagó más de lo que falta de toda la venta: no se registra (devuelve error con el máximo).
 *
 * `cuotasDeLaVenta` son todas las cuotas de la venta (pagadas o no), incluida la que se paga.
 * Devuelve { ajustes: [{ id, monto, estado? }], saldo: { n_cuota, monto, fecha_vencimiento } | null }
 * o { error, maximo }.
 */
export function recalcularPago({ cuota, montoPagado, fechaPago, cuotasDeLaVenta }) {
  const pagado = r2(montoPagado);
  if (!(pagado > 0)) return { error: 'El monto pagado tiene que ser mayor que cero.' };
  const pendientes = cuotasDeLaVenta
    .filter((c) => c.id !== cuota.id && c.estado === 'Pendiente')
    .sort((a, b) => (a.n_cuota || 0) - (b.n_cuota || 0));
  const faltaDeLaVenta = r2(Number(cuota.monto) + pendientes.reduce((s, c) => s + Number(c.monto), 0));
  if (pagado > faltaDeLaVenta + 0.001) {
    return { error: `El pago supera lo que falta pagar de esta venta (${faltaDeLaVenta}).`, maximo: faltaDeLaVenta };
  }
  const delta = r2(Number(cuota.monto) - pagado); // > 0: pagó de menos
  if (Math.abs(delta) < 0.005) return { ajustes: [], saldo: null };

  if (pendientes.length > 0) {
    const nuevoTotal = r2(pendientes.reduce((s, c) => s + Number(c.monto), 0) + delta);
    const montos = repartir(nuevoTotal, pendientes.length);
    return {
      ajustes: pendientes.map((c, i) => (montos[i] <= 0
        ? { id: c.id, monto: 0, estado: 'Pagado', fecha_pago: fechaPago, notas: `Cubierta por el pago adelantado de la cuota ${cuota.n_cuota}.` }
        : { id: c.id, monto: montos[i] })),
      saldo: null,
    };
  }

  // Sin cuotas pendientes: si pagó de menos, el saldo va a una cuota nueva.
  const ultimoNumero = Math.max(0, ...cuotasDeLaVenta.map((c) => Number(c.n_cuota) || 0));
  return {
    ajustes: [],
    saldo: delta > 0 ? { n_cuota: ultimoNumero + 1, monto: delta, fecha_vencimiento: sumarMeses(fechaPago, 1) } : null,
  };
}
