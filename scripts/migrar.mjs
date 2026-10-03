// Aplica las migraciones de supabase/migrations que falten en la base de DATABASE_URL (.env.local).
// Sirve igual para Supabase en la nube y para el local. Las ya aplicadas no se repiten.
//   npm run db:migrar
import { leerEntorno, requerir } from './lib/entorno.mjs';
import { supabaseCli } from './lib/cli.mjs';

const entorno = leerEntorno();
requerir(entorno, 'DATABASE_URL');
const url = entorno.DATABASE_URL;
if (!/^postgres(ql)?:\/\//.test(url)) {
  console.error('DATABASE_URL tiene que empezar con postgresql://. Cópiala de Supabase: Connect > Session pooler.');
  process.exit(1);
}
if (url.includes('"')) {
  console.error('DATABASE_URL no puede tener comillas.');
  process.exit(1);
}
const { status } = supabaseCli(['db', 'push', '--db-url', url, '--yes']);
process.exit(status ?? 1);
