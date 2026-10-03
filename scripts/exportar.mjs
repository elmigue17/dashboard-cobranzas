// Exporta todas las tablas a archivos CSV (se abren con Excel o Google Sheets), en
// mis-datos/exportado-AAAA-MM-DD/. Tus datos son tuyos: así te los llevas cuando quieras.
//   npm run exportar
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './lib/entorno.mjs';
import { conectar, traerTodo, TABLAS_DEL_NEGOCIO } from './lib/base.mjs';
import { hoy } from '../src/fechas.js';

const db = conectar();
const carpeta = join(RAIZ, 'mis-datos', `exportado-${hoy()}`);
mkdirSync(carpeta, { recursive: true });

const celda = (v) => {
  if (v == null) return '';
  const t = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n\r;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

for (const tabla of TABLAS_DEL_NEGOCIO) {
  const filas = await traerTodo(db, tabla);
  const columnas = filas.length ? Object.keys(filas[0]) : [];
  const csv = [columnas.join(','), ...filas.map((f) => columnas.map((c) => celda(f[c])).join(','))].join('\r\n');
  writeFileSync(join(carpeta, `${tabla}.csv`), `﻿${csv}\r\n`, 'utf8');
  console.log(`${tabla}.csv: ${filas.length} filas`);
}
console.log(`\nListo, en ${carpeta}`);
