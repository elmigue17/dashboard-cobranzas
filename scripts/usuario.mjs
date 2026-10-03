// Usuarios del dashboard. Necesita VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local.
//
//   npm run usuario -- crear correo@ejemplo.com           crea el usuario con una contraseña temporal
//                                                         y le da acceso
//   npm run usuario -- dar-acceso correo@ejemplo.com      da acceso a un usuario que ya existe
//                                                         (por ejemplo, creado desde el panel de Supabase)
//   npm run usuario -- quitar-acceso correo@ejemplo.com   le quita el acceso (no borra la cuenta)
//   npm run usuario -- listar                             muestra quién tiene acceso
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { leerEntorno, requerir } from './lib/entorno.mjs';

const entorno = leerEntorno();
requerir(entorno, 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(entorno.VITE_SUPABASE_URL, entorno.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const [accion, emailCrudo] = process.argv.slice(2);
const email = String(emailCrudo || '').trim().toLowerCase();

const salir = (mensaje) => {
  console.error(mensaje);
  process.exit(1);
};

// Contraseña temporal fácil de copiar: letras y números, sin caracteres que se confundan.
const claveTemporal = () => {
  const letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from(randomBytes(14), (b) => letras[b % letras.length]).join('');
};

async function buscarUsuario(correo) {
  for (let page = 1; page < 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) salir('No se pudo leer la lista de usuarios: ' + error.message);
    const encontrado = data.users.find((u) => (u.email || '').toLowerCase() === correo);
    if (encontrado) return encontrado;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function darAcceso(usuario) {
  const { error } = await supabase.from('acceso').upsert({ user_id: usuario.id, email: usuario.email });
  if (error) salir('No se pudo dar acceso: ' + error.message);
}

if (accion === 'crear') {
  if (!email.includes('@')) salir('Uso: npm run usuario -- crear correo@ejemplo.com');
  const existente = await buscarUsuario(email);
  if (existente) {
    await darAcceso(existente);
    console.log(`${email} ya existía. Ahora tiene acceso. Si no recuerda la contraseña, cámbiala desde el panel de Supabase (Authentication > Users).`);
  } else {
    const clave = claveTemporal();
    const { data, error } = await supabase.auth.admin.createUser({ email, password: clave, email_confirm: true });
    if (error) salir('No se pudo crear el usuario: ' + error.message);
    await darAcceso(data.user);
    console.log(`Usuario creado y con acceso: ${email}`);
    console.log(`Contraseña temporal: ${clave}`);
    console.log('Entra al dashboard y cámbiala en la barra lateral (Contraseña).');
  }
} else if (accion === 'dar-acceso') {
  if (!email.includes('@')) salir('Uso: npm run usuario -- dar-acceso correo@ejemplo.com');
  const usuario = await buscarUsuario(email);
  if (!usuario) salir(`No existe ningún usuario con el correo ${email}. Créalo con: npm run usuario -- crear ${email}`);
  await darAcceso(usuario);
  console.log(`${email} ahora tiene acceso.`);
} else if (accion === 'quitar-acceso') {
  if (!email.includes('@')) salir('Uso: npm run usuario -- quitar-acceso correo@ejemplo.com');
  const usuario = await buscarUsuario(email);
  if (!usuario) salir(`No existe ningún usuario con el correo ${email}.`);
  const { error } = await supabase.from('acceso').delete().eq('user_id', usuario.id);
  if (error) salir('No se pudo quitar el acceso: ' + error.message);
  console.log(`${email} ya no tiene acceso (la cuenta sigue existiendo).`);
} else if (accion === 'listar') {
  const { data, error } = await supabase.from('acceso').select('email, created_at').order('created_at');
  if (error) salir('No se pudo leer la lista: ' + error.message);
  if (!data.length) console.log('Nadie tiene acceso todavía.');
  for (const fila of data) console.log(`${fila.email}  (desde ${fila.created_at.slice(0, 10)})`);
} else {
  salir('Uso: npm run usuario -- crear|dar-acceso|quitar-acceso correo@ejemplo.com, o npm run usuario -- listar');
}
