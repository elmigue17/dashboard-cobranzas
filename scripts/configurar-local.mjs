// Con Supabase corriendo en tu computadora (npm run db:local), escribe .env.local con su
// dirección y sus claves. Las claves locales son las de desarrollo de Supabase: solo sirven en tu PC.
//   npm run configurar:local
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './lib/entorno.mjs';
import { supabaseCli } from './lib/cli.mjs';

const { status, stdout, stderr } = supabaseCli(['status', '-o', 'env'], { mostrar: false });
if (status !== 0) {
  console.error('Supabase local no está corriendo. Primero: npm run db:local');
  console.error(stderr.trim());
  process.exit(1);
}
const valores = {};
for (const linea of stdout.split(/\r?\n/)) {
  const m = linea.match(/^([A-Z_]+)="?(.*?)"?$/);
  if (m) valores[m[1]] = m[2];
}
const nuevos = {
  VITE_SUPABASE_URL: valores.API_URL,
  VITE_SUPABASE_ANON_KEY: valores.PUBLISHABLE_KEY || valores.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: valores.SECRET_KEY || valores.SERVICE_ROLE_KEY,
  DATABASE_URL: valores.DB_URL,
};
if (Object.values(nuevos).some((v) => !v)) {
  console.error('No se pudieron leer todas las claves de `supabase status`. Esto devolvió:');
  console.error(stdout);
  process.exit(1);
}

const ruta = join(RAIZ, '.env.local');
const lineas = existsSync(ruta) ? readFileSync(ruta, 'utf8').split(/\r?\n/).filter((l) => l && !Object.keys(nuevos).some((k) => l.startsWith(`${k}=`))) : [];
writeFileSync(ruta, [...lineas, ...Object.entries(nuevos).map(([k, v]) => `${k}=${v}`), ''].join('\n'));
console.log(`.env.local listo para Supabase local (${nuevos.VITE_SUPABASE_URL}).`);
