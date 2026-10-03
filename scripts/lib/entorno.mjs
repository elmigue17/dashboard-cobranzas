// Lee .env.local (y .env) de la raíz del proyecto. Lo que ya esté en el entorno manda.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function leerEntorno() {
  const valores = {};
  for (const nombre of ['.env', '.env.local']) {
    const ruta = join(RAIZ, nombre);
    if (!existsSync(ruta)) continue;
    for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      valores[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return { ...valores, ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k in valores || /^(VITE_SUPABASE_|SUPABASE_|DATABASE_URL)/.test(k))) };
}

export function requerir(entorno, ...nombres) {
  const faltan = nombres.filter((n) => !entorno[n]);
  if (faltan.length) {
    console.error(`Faltan en .env.local: ${faltan.join(', ')}. Mira .env.example.`);
    process.exit(1);
  }
}
