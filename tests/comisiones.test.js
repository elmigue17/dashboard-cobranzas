import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comisionesDe, columnasComision, resumenPorPersona } from '../src/comisiones.js';

const pct = { setter: 10, closer: 10, mismaPersona: 20 };

test('setter y closer distintos: 10% cada uno', () => {
  assert.deepEqual(comisionesDe({ monto: 300, setter: 'Ana', closer: 'Luis' }, pct).map((x) => x.comision), [30, 30]);
});

test('misma persona: 20% una sola vez', () => {
  const lista = comisionesDe({ monto: 300, setter: 'Luis', closer: 'Luis' }, pct);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].rol, 'Setter+Closer');
  assert.equal(lista[0].comision, 60);
  assert.deepEqual(columnasComision({ monto: 300, setter: 'Luis', closer: 'Luis' }, pct), { comision_setter: 30, comision_closer: 30 });
});

test('quien es solo setter en unas cuotas y setter+closer en otra no cobra 20% sobre todas', () => {
  const cuotas = [
    { monto: 100, setter: 'Luis', closer: 'Marta' },
    { monto: 200, setter: 'Luis', closer: 'Marta' },
    { monto: 500, setter: 'Luis', closer: 'Luis' },
  ];
  const luis = resumenPorPersona(cuotas, pct).find((p) => p.nombre === 'Luis');
  // 10% de 300 + 20% de 500 = 30 + 100
  assert.equal(luis.total, 130);
  assert.deepEqual(luis.roles.map((r) => [r.rol, r.base, r.total]), [['Setter', 300, 30], ['Setter+Closer', 500, 100]]);
  const marta = resumenPorPersona(cuotas, pct).find((p) => p.nombre === 'Marta');
  assert.equal(marta.total, 30);
});

test('la venta del video: 300 + 200 + 500 cobrados dan 100 al setter y 100 al closer', () => {
  const cuotas = [300, 200, 500].map((monto) => ({ monto, setter: 'Ana', closer: 'Marta' }));
  const resumen = resumenPorPersona(cuotas, pct);
  assert.deepEqual(resumen.map((p) => [p.nombre, p.total]), [['Ana', 100], ['Marta', 100]]);
});

test('sin setter ni closer no hay comisión', () => {
  assert.deepEqual(comisionesDe({ monto: 300, setter: '  ', closer: null }, pct), []);
  assert.deepEqual(columnasComision({ monto: 300 }, pct), { comision_setter: null, comision_closer: null });
});
