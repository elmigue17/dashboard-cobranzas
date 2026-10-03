import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoDeAlumno } from '../src/alumnos.js';

const hoy = '2026-10-03';

test('el estado sale de la fecha de fin', () => {
  assert.equal(estadoDeAlumno({ estado: 'Activo', fecha_fin: '2027-01-10' }, hoy), 'Activo');
  assert.equal(estadoDeAlumno({ estado: 'Activo', fecha_fin: '2026-10-18' }, hoy), 'Por vencer');
  assert.equal(estadoDeAlumno({ estado: 'Activo', fecha_fin: '2026-10-02' }, hoy), 'Vencido');
  // Un "Por vencer" guardado hace meses ya no vale: manda la fecha.
  assert.equal(estadoDeAlumno({ estado: 'Por vencer', fecha_fin: '2026-09-01' }, hoy), 'Vencido');
});

test('congelado y baja mandan sobre la fecha', () => {
  assert.equal(estadoDeAlumno({ estado: 'Activo', congelado_desde: '2026-09-20', fecha_fin: '2026-09-01' }, hoy), 'Pausado');
  assert.equal(estadoDeAlumno({ estado: 'Activo', fecha_baja: '2026-08-01', fecha_fin: '2027-01-01' }, hoy), 'Churneado');
});
