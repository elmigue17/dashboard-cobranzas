// Carga datos de EJEMPLO (inventados) con los programas, el equipo y la zona horaria de negocio.config.js.
//
//   npm run datos:ejemplo                  carga los datos si la base está vacía
//   npm run datos:ejemplo -- --reemplazar  borra los datos del negocio que haya y carga los de ejemplo
//
// No toca los usuarios ni la lista de acceso. Para sacarlos después: npm run datos:vaciar
import { conectar, hayDatos, insertarEnLotes, vaciarDatosDelNegocio, TABLAS_DEL_NEGOCIO } from './lib/base.mjs';
import { generarDatosDeEjemplo } from './lib/generador.mjs';
import { fmtMoney } from '../src/config.js';

const reemplazar = process.argv.includes('--reemplazar');
const db = conectar();

if (await hayDatos(db)) {
  if (!reemplazar) {
    console.error('La base ya tiene datos. Si quieres borrarlos y cargar los de ejemplo: npm run datos:ejemplo -- --reemplazar');
    process.exit(1);
  }
  console.log('Borrando los datos que había...');
  await vaciarDatosDelNegocio(db);
}

const { filas, demo, hoy } = generarDatosDeEjemplo();
for (const tabla of TABLAS_DEL_NEGOCIO) {
  await insertarEnLotes(db, tabla, filas[tabla]);
  console.log(`${tabla}: ${filas[tabla].length}`);
}
console.log(`\nDatos de ejemplo cargados (hoy es ${hoy}). Todo es inventado.`);
console.log('Alumnos para probar "Registrar pago":');
const casos = { menos: 'pago de menos', mas: 'pago de más', saldo: 'pago de menos en la última cuota' };
for (const d of demo) {
  console.log(`- ${d.nombre} (${casos[d.caso]}): ${d.pendientes.map((c) => `cuota ${c.n} de ${fmtMoney(c.monto)} vence ${c.vence}`).join('; ')}`);
}
