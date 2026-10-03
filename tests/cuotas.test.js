import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repartir, planDeCuotas, recalcularPago } from '../src/cuotas.js';

const suma = (xs) => Math.round(xs.reduce((s, x) => s + x, 0) * 100) / 100;

test('repartir deja los centavos en la última cuota', () => {
  assert.deepEqual(repartir(1000, 3), [333.33, 333.33, 333.34]);
  assert.deepEqual(repartir(700, 2), [350, 350]);
  assert.equal(suma(repartir(1234.57, 7)), 1234.57);
});

test('plan con pago en la llamada: 1.200 en 4 cuotas, 300 en la llamada', () => {
  const { cuotas } = planDeCuotas({ montoTotal: 1200, nCuotas: 4, pagoEnLlamada: 300, fechaInicio: '2026-01-31' });
  assert.deepEqual(cuotas.map((c) => c.monto), [300, 300, 300, 300]);
  assert.deepEqual(cuotas.map((c) => c.pagada), [true, false, false, false]);
  assert.deepEqual(cuotas.map((c) => c.fecha_vencimiento), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
});

test('plan sin pago en la llamada suma exacto', () => {
  const { cuotas } = planDeCuotas({ montoTotal: 1000, nCuotas: 3, fechaInicio: '2026-10-03' });
  assert.equal(suma(cuotas.map((c) => c.monto)), 1000);
});

test('plan rechaza combinaciones que perderían plata', () => {
  assert.ok(planDeCuotas({ montoTotal: 500, nCuotas: 1, pagoEnLlamada: 200, fechaInicio: '2026-10-03' }).error);
  assert.ok(planDeCuotas({ montoTotal: 500, nCuotas: 3, pagoEnLlamada: 600, fechaInicio: '2026-10-03' }).error);
});

// La venta del video: 1.200 en 4 cuotas, pagó 300 en la llamada.
const venta = () => [
  { id: 'c1', n_cuota: 1, monto: 300, estado: 'Pagado' },
  { id: 'c2', n_cuota: 2, monto: 300, estado: 'Pendiente' },
  { id: 'c3', n_cuota: 3, monto: 300, estado: 'Pendiente' },
  { id: 'c4', n_cuota: 4, monto: 300, estado: 'Pendiente' },
];

test('pago de menos: los 100 que faltan se reparten en las cuotas que quedan', () => {
  const v = venta();
  const r = recalcularPago({ cuota: v[1], montoPagado: 200, fechaPago: '2026-10-03', cuotasDeLaVenta: v });
  assert.deepEqual(r.ajustes, [{ id: 'c3', monto: 350 }, { id: 'c4', monto: 350 }]);
  assert.equal(r.saldo, null);
});

test('pago de más: la última cuota baja', () => {
  const v = venta();
  v[1] = { ...v[1], monto: 200, estado: 'Pagado' };
  v[2].monto = 350;
  v[3].monto = 350;
  const r = recalcularPago({ cuota: v[2], montoPagado: 500, fechaPago: '2026-11-03', cuotasDeLaVenta: v });
  assert.deepEqual(r.ajustes, [{ id: 'c4', monto: 200 }]);
});

test('pago de menos en la última cuota crea una cuota de saldo a un mes', () => {
  const v = [
    { id: 'a', n_cuota: 1, monto: 1000, estado: 'Pagado' },
    { id: 'b', n_cuota: 2, monto: 1000, estado: 'Pagado' },
    { id: 'c', n_cuota: 3, monto: 1000, estado: 'Pendiente' },
  ];
  const r = recalcularPago({ cuota: v[2], montoPagado: 700, fechaPago: '2026-10-09', cuotasDeLaVenta: v });
  assert.deepEqual(r.saldo, { n_cuota: 4, monto: 300, fecha_vencimiento: '2026-11-09' });
});

test('no se puede pagar más de lo que falta de la venta', () => {
  const v = venta();
  const r = recalcularPago({ cuota: v[1], montoPagado: 901, fechaPago: '2026-10-03', cuotasDeLaVenta: v });
  assert.equal(r.maximo, 900);
});

test('si el pago cubre todo lo que falta, las demás quedan pagadas en 0', () => {
  const v = venta();
  const r = recalcularPago({ cuota: v[1], montoPagado: 900, fechaPago: '2026-10-03', cuotasDeLaVenta: v });
  assert.deepEqual(r.ajustes.map((a) => [a.id, a.monto, a.estado]), [['c3', 0, 'Pagado'], ['c4', 0, 'Pagado']]);
});
