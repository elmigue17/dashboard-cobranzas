// Borra TODOS los datos del negocio (alumnos, ventas, cuotas, leads, llamadas y contenido).
// No toca los usuarios ni la lista de acceso. Pide confirmar con --si.
//
//   npm run datos:vaciar -- --si
import { conectar, vaciarDatosDelNegocio } from './lib/base.mjs';

if (!process.argv.includes('--si')) {
  console.error('Esto borra todos los datos del negocio y no se puede deshacer. Para confirmar: npm run datos:vaciar -- --si');
  process.exit(1);
}
await vaciarDatosDelNegocio(conectar());
console.log('Listo: la base quedó sin datos del negocio (los usuarios siguen).');
