// La CLI de Supabase, siempre en la misma versión (la que está probada con este proyecto).
import { spawnSync } from 'node:child_process';

export const VERSION_CLI = '2.119.0';

/** Corre `npx supabase@VERSION ...args`. Devuelve { status, stdout, stderr }. */
export function supabaseCli(args, { mostrar = true } = {}) {
  // En Windows npx es un .cmd y necesita la shell: cada argumento va entre comillas.
  const comillas = (a) => (/^[\w@.:/=-]+$/.test(a) ? a : `"${String(a).replace(/"/g, '\\"')}"`);
  const resultado = spawnSync('npx', ['-y', `supabase@${VERSION_CLI}`, ...args].map(comillas), {
    shell: true,
    encoding: 'utf8',
    stdio: mostrar ? 'inherit' : 'pipe',
  });
  return { status: resultado.status, stdout: resultado.stdout || '', stderr: resultado.stderr || '' };
}
