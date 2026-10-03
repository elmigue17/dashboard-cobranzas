// Revisa que la base no quede abierta al público. Hace lo mismo que haría un extraño que encontró la
// dirección y la clave pública (las dos viajan en la página): intenta leer cada tabla sin iniciar sesión.
//   npm run verificar
import { createClient } from '@supabase/supabase-js';
import { leerEntorno, requerir } from './lib/entorno.mjs';
import { TABLAS_DEL_NEGOCIO } from './lib/base.mjs';

const entorno = leerEntorno();
requerir(entorno, 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY');
const url = entorno.VITE_SUPABASE_URL.replace(/\/$/, '');
const anon = createClient(url, entorno.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

let problemas = 0;
console.log(`Probando ${url} sin iniciar sesión, como lo haría cualquiera:\n`);
for (const tabla of [...TABLAS_DEL_NEGOCIO, 'acceso']) {
  const { data, error } = await anon.from(tabla).select('*').limit(1);
  if (error) console.log(`  ${tabla.padEnd(16)} cerrada (${error.code === '42501' ? 'sin permiso' : error.message})`);
  else if (!data.length) console.log(`  ${tabla.padEnd(16)} no devuelve filas`);
  else {
    problemas += 1;
    console.log(`  ${tabla.padEnd(16)} ABIERTA: devolvió datos sin iniciar sesión`);
  }
}

const archivos = await anon.storage.from('comprobantes').list('', { limit: 1 });
console.log(`  ${'comprobantes'.padEnd(16)} ${archivos.data?.length ? 'ABIERTO: se pueden listar archivos' : 'cerrado'}`);
if (archivos.data?.length) problemas += 1;

try {
  const respuesta = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: entorno.VITE_SUPABASE_ANON_KEY } });
  const ajustes = await respuesta.json();
  if (ajustes.disable_signup) console.log('\n  Registro de cuentas nuevas: apagado.');
  else console.log('\n  Registro de cuentas nuevas: PRENDIDO. No es grave (una cuenta nueva no ve nada hasta que le das acceso),\n  pero conviene apagarlo: en Supabase, Authentication > Sign In / Providers > "Allow new users to sign up".');
} catch {
  console.log('\n  No se pudo consultar si el registro de cuentas está apagado.');
}

console.log(problemas ? `\n${problemas} problema(s): la base NO está cerrada. No cargues datos todavía.` : '\nTodo cerrado: sin iniciar sesión no se ve nada.');
process.exit(problemas ? 1 : 0);
