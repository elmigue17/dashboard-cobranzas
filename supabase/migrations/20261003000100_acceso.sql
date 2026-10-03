-- Quién puede entrar y qué ve cada uno.
--
-- La regla es simple: los datos solo los ve y los cambia un usuario que inició sesión Y que está en la
-- tabla `acceso`. Sin sesión (el rol `anon`, que es lo que usa cualquiera que tenga la URL y la clave
-- pública) no se ve nada: ni una fila.
--
-- ¿Por qué hace falta la tabla `acceso` si ya hay login? Porque en Supabase, si el registro de usuarios
-- queda abierto, cualquiera puede crearse una cuenta con la clave pública. Con esta tabla, una cuenta
-- nueva no ve nada hasta que alguien con acceso la agrega (npm run usuario -- dar-acceso correo@...).
--
-- Si agregas una tabla nueva, repite lo de abajo para ella: activar RLS y crear la política "equipo".

-- ─── Lista de usuarios con acceso ───────────────────────────────────────────────────────────────

create table public.acceso (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.acceso enable row level security;
-- Sin políticas: nadie la lee ni la cambia desde la app. Se maneja con la clave secreta
-- (scripts/usuario.mjs) o desde el panel de Supabase.

-- ¿El usuario de esta sesión tiene acceso? security definer: puede leer `acceso` aunque la tabla
-- no tenga políticas. search_path vacío para que nadie pueda colarle otra tabla con el mismo nombre.
create or replace function public.tiene_acceso()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.acceso where user_id = (select auth.uid()));
$$;

revoke execute on function public.tiene_acceso() from public, anon;
grant execute on function public.tiene_acceso() to authenticated, service_role;

-- ─── Permisos por rol ───────────────────────────────────────────────────────────────────────────
-- anon no tiene permiso sobre ninguna tabla (ni siquiera llega a las políticas).
-- authenticated tiene permiso, pero las políticas de abajo filtran por `acceso`.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon;

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- ─── Políticas ──────────────────────────────────────────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'contenidos', 'leads', 'lead_eventos', 'lead_contenidos', 'llamadas', 'alumnos', 'ventas', 'cuotas'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "equipo" on public.%I for all to authenticated '
      'using ((select public.tiene_acceso())) with check ((select public.tiene_acceso()))',
      t
    );
  end loop;
end $$;
