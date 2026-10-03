import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTimeZoneDateKey } from '../src/timezone.js';
import { sumarMeses, sumarDias, diasEntre, fmtFecha } from '../src/fechas.js';

test('a las 20:30 de Lima ya es mañana en UTC, pero "hoy" sigue siendo hoy en Lima', () => {
  const instante = new Date('2026-10-04T01:30:00Z'); // 3 de octubre, 20:30 en Lima
  assert.equal(getTimeZoneDateKey(instante, 'America/Lima'), '2026-10-03');
  assert.equal(getTimeZoneDateKey(instante, 'UTC'), '2026-10-04');
});

test('una fecha guardada se muestra en su día, sin importar la zona de la computadora', () => {
  // Antes: new Date('2026-10-03') es la medianoche UTC y en América se mostraba el 2 de octubre.
  assert.equal(fmtFecha('2026-10-03'), '3 oct 2026');
  assert.equal(fmtFecha('2026-01-01'), '1 ene 2026');
});

test('sumar meses respeta el fin de mes y los años', () => {
  assert.equal(sumarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(sumarMeses('2028-01-31', 1), '2028-02-29');
  assert.equal(sumarMeses('2026-11-15', 3), '2027-02-15');
  assert.equal(sumarMeses('2026-10-01', -1), '2026-09-01');
});

test('días entre fechas y sumar días', () => {
  assert.equal(diasEntre('2026-10-03', '2026-10-18'), 15);
  assert.equal(diasEntre('2026-10-03', '2026-10-02'), -1);
  assert.equal(sumarDias('2026-12-30', 3), '2027-01-02');
});
