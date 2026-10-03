-- Esquema del dashboard de cobranzas y comisiones.
--
-- Tablas:
--   contenidos       piezas de contenido (reels, carruseles, historias) que traen leads
--   leads            prospectos y en qué estado de la conversación está cada uno
--   lead_eventos     cada cambio de estado de un lead (alimenta las métricas del Dashboard)
--   lead_contenidos  qué pieza de contenido trajo a cada lead
--   llamadas         llamadas de venta agendadas y su resultado
--   alumnos          clientes que compraron un programa
--   ventas           cada compra (o renovación) de un alumno
--   cuotas           el plan de pagos de cada venta: monto, vencimiento, si se pagó y la comisión

-- ─── contenidos ─────────────────────────────────────────────────────────────────────────────────
-- El id es el código de la pieza que llega desde tu herramienta de mensajes (por ejemplo C_21_04,
-- R_19_04, H_10_03 o NEW_FOLLOW). La primera letra dice el tipo: C carrusel, R reel, H historia.

create table public.contenidos (
  id text primary key,
  created_at timestamptz not null default now(),
  nombre text,
  fecha timestamptz,
  link text
);

create index contenidos_fecha_idx on public.contenidos (fecha desc);

-- ─── leads ──────────────────────────────────────────────────────────────────────────────────────

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  usuario text,
  estado text not null default 'frio',
  setter text,
  ultima_interaccion timestamptz,
  contexto text,
  link_conversacion text,
  id_externo text,
  constraint leads_estado_check check (estado in (
    'frio', 'en_conversacion', 'interesado', 'agendado', 'cerrado', 'perdido'
  ))
);

create index leads_created_at_idx on public.leads (created_at desc);
create index leads_estado_idx on public.leads (estado);
create index leads_ultima_interaccion_idx on public.leads (ultima_interaccion desc);
create index leads_usuario_idx on public.leads (usuario);

-- ─── lead_eventos ───────────────────────────────────────────────────────────────────────────────

create table public.lead_eventos (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  estado_anterior text,
  estado_nuevo text,
  created_at timestamptz not null default now()
);

create index lead_eventos_lead_idx on public.lead_eventos (lead_id);
create index lead_eventos_created_at_idx on public.lead_eventos (created_at desc);

-- ─── lead_contenidos ────────────────────────────────────────────────────────────────────────────

create table public.lead_contenidos (
  lead_id uuid not null references public.leads(id) on delete cascade,
  contenido_id text not null references public.contenidos(id) on delete cascade on update cascade,
  created_at timestamptz not null default now(),
  primary key (lead_id, contenido_id)
);

create index lead_contenidos_contenido_idx on public.lead_contenidos (contenido_id, created_at desc);

-- ─── llamadas ───────────────────────────────────────────────────────────────────────────────────

create table public.llamadas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid references public.leads(id) on delete set null,
  nombre text,
  instagram text,
  email text,
  telefono text,
  fecha_llamada timestamptz,
  enlace text,
  ingresos_actuales text,
  dolores text,
  capacidad_economica text,
  estado text,
  resultado text,
  calificada boolean,
  closer text,
  constraint llamadas_estado_check check (estado in ('Agendada', 'Presentada', 'No asistió', 'Cancelada')),
  constraint llamadas_resultado_check check (resultado in (
    'Cierre', 'Seguimiento', 'No califica financiero', 'No es el momento', 'Perdido'
  ))
);

create index llamadas_fecha_idx on public.llamadas (fecha_llamada desc);

-- ─── alumnos ────────────────────────────────────────────────────────────────────────────────────
-- programa, fechas, setter y closer son los de su compra más reciente.
-- dias_congelados: días acumulados de congelamientos ya terminados (corren la fecha de fin).

create table public.alumnos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  email text,
  telefono text,
  programa text,
  estado text not null default 'Activo',
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  duracion_meses numeric,
  fecha_baja timestamptz,
  congelado_desde timestamptz,
  dias_congelados integer not null default 0,
  setter text,
  closer text,
  notas text,
  constraint alumnos_estado_check check (estado in ('Activo', 'Por vencer', 'Vencido', 'Pausado', 'Churneado'))
);

create index alumnos_fecha_inicio_idx on public.alumnos (fecha_inicio desc);

-- ─── ventas ─────────────────────────────────────────────────────────────────────────────────────

create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  alumno_id uuid not null references public.alumnos(id) on delete cascade,
  programa text not null,
  monto numeric(12, 2) not null,
  fecha_venta timestamptz not null,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  n_cuotas integer,
  setter text,
  closer text,
  es_renovacion boolean not null default false,
  notas text
);

create index ventas_alumno_idx on public.ventas (alumno_id);
create index ventas_fecha_venta_idx on public.ventas (fecha_venta desc);

-- ─── cuotas ─────────────────────────────────────────────────────────────────────────────────────
-- setter y closer se copian de la venta al crear la cuota: la comisión se calcula con los de la cuota.

create table public.cuotas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  venta_id uuid not null references public.ventas(id) on delete cascade,
  alumno_id uuid not null references public.alumnos(id) on delete cascade,
  n_cuota integer not null,
  monto numeric(12, 2) not null,
  fecha_vencimiento timestamptz,
  fecha_pago timestamptz,
  estado text not null default 'Pendiente',
  setter text,
  closer text,
  comision_setter numeric(12, 2),
  comision_closer numeric(12, 2),
  comprobante_url text,
  notas text,
  constraint cuotas_estado_check check (estado in ('Pendiente', 'Pagado', 'Incobrable'))
);

create index cuotas_alumno_idx on public.cuotas (alumno_id);
create index cuotas_venta_idx on public.cuotas (venta_id);
create index cuotas_vencimiento_idx on public.cuotas (fecha_vencimiento);
create index cuotas_estado_idx on public.cuotas (estado);

-- ─── Acceso ─────────────────────────────────────────────────────────────────────────────────────

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;

do $$
declare
  t text;
begin
  foreach t in array array[
    'contenidos', 'leads', 'lead_eventos', 'lead_contenidos', 'llamadas', 'alumnos', 'ventas', 'cuotas'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "acceso_total" on public.%I for all to anon, authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
