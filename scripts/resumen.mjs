// Muestra qué hay en la base: alumnos por estado, ventas, cuotas, lo cobrado y las comisiones.
//   npm run resumen
import { conectar } from './lib/base.mjs';
import { imprimirResumen } from './lib/resumen.mjs';

await imprimirResumen(conectar());
