# CLAUDE.md

Guía para Claude Code (claude.com/claude-code) cuando trabaja en este repositorio.

## Antes de cambiar cualquier cosa: lee NEGOCIO.md

`NEGOCIO.md` es la memoria del negocio que usa este dashboard: qué vende, cómo cobra, quién cobra
comisión y por qué se decidió cada cosa. **Léelo antes de cambiar nada.** Si un pedido contradice algo
que dice ahí (por ejemplo, otro porcentaje de comisión), pregunta antes de cambiarlo. Cuando cambies
algo del negocio, actualiza `NEGOCIO.md` (sección *Decisiones y cambios*, con la fecha y el porqué).

Si `NEGOCIO.md` todavía dice "(sin completar)", el proyecto no está instalado: sigue `INSTALAR.md`.

## Qué es

Dashboard de cobranzas y comisiones para negocios que venden programas en cuotas. React 19 + Vite,
sin router (la navegación es el estado `activeView` en `src/App.jsx`), contra una base Supabase
(Postgres + Auth + Storage). Todo el texto para usuarios va en **español neutro con tuteo**
(tienes, puedes; nunca voseo) y **sin guiones largos**.

## Comandos

```bash
npm run dev               # la app en http://localhost:5180
npm run build             # compila a dist/
npm run lint              # ESLint
npm test                  # pruebas de la lógica de cuotas, comisiones y alumnos (node --test)

npm run db:local          # Supabase en Docker (API 54421, base 54422, Studio 54423)
npm run db:local:apagar
npm run configurar:local  # escribe .env.local con las claves del Supabase local
npm run db:migrar         # aplica las migraciones que falten en DATABASE_URL (nube o local)
npm run verificar         # comprueba que sin sesión no se lee ninguna tabla
npm run usuario -- crear|dar-acceso|quitar-acceso|nueva-clave correo@...   (o: listar)
npm run datos:ejemplo     # datos inventados según negocio.config.js (-- --reemplazar si hay datos)
npm run datos:vaciar -- --si
npm run importar -- mis-datos/importar.json [--probar | --reemplazar | --agregar]
npm run resumen           # qué hay en la base
npm run exportar          # todas las tablas a CSV en mis-datos/
```

La CLI de Supabase se usa siempre como `npx supabase@2.119.0` (ver `scripts/lib/cli.mjs`).

## Configuración

- **`negocio.config.js`**: nombre, zona horaria, moneda, programas (duración, precio, cuotas), equipo y
  comisiones (porcentajes y si se pagan sobre lo cobrado o lo vendido). Es el único lugar para esos
  datos: no los repitas en el código. `src/config.js` lo lee y expone `fmtMoney`, `PROGRAMAS`,
  `duracionDePrograma`, `EQUIPO`, `PORCENTAJES`, `COMISION_SOBRE`, `ZONA_HORARIA`, etc.
- **`.env.local`** (no va a git; plantilla en `.env.example`): `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_ANON_KEY` (públicas, llegan al navegador), `SUPABASE_SERVICE_ROLE_KEY` y
  `DATABASE_URL` (secretas, solo para los scripts). **Nunca** le pongas `VITE_` a una clave secreta.

## Base de datos

Esquema en `supabase/migrations/`. Tablas: `contenidos`, `leads`, `lead_eventos`, `lead_contenidos`,
`llamadas`, `alumnos`, `ventas`, `cuotas` y `acceso`.

- Un **alumno** tiene **ventas** (la compra y cada renovación) y cada venta tiene sus **cuotas**. Cada
  cuota apunta a su venta y a su alumno por id. `setter` y `closer` se copian de la venta a cada cuota:
  la comisión se calcula con los de la cuota.
- **Fechas de calendario** (vencimiento, pago, inicio, fin, venta) son columnas `date` y en el código se
  tratan siempre como texto `'AAAA-MM-DD'` con las funciones de `src/fechas.js`. Nunca
  `new Date('2026-10-03')`: lo lee como medianoche UTC y en América muestra el día anterior.
  Los momentos (`created_at`, `ultima_interaccion`, `fecha_llamada`) son `timestamptz`.
- El **estado del alumno** que se muestra sale de `src/alumnos.js`: Pausado y Churneado se marcan a
  mano; Activo, Por vencer y Vencido se calculan con la fecha de fin.
- Supabase devuelve como máximo 1000 filas por pedido: para leer tablas enteras usa `traerTodo`
  (`src/traerTodo.js` en la app, `scripts/lib/base.mjs` en los scripts).

### Seguridad (no la rompas)

- Sin sesión (rol `anon`) no hay permiso sobre ninguna tabla. Con sesión, la política `equipo` deja leer
  y escribir solo a quien está en la tabla `acceso` (función `tiene_acceso()`).
- **Toda tabla nueva** necesita, en su migración: `alter table ... enable row level security;` y
  `create policy "equipo" on ... for all to authenticated using ((select public.tiene_acceso())) with check ((select public.tiene_acceso()));`.
  Después corre `npm run verificar`.
- Los comprobantes van al bucket privado `comprobantes`; en la cuota se guarda la ruta y se abren con
  `createSignedUrl`.
- Para cambiar el esquema, crea una migración nueva en `supabase/migrations/` (no edites las que ya se
  aplicaron) y aplícala con `npm run db:migrar`.

## Lógica de negocio (con pruebas)

- `src/cuotas.js`: plan de cuotas de una venta y recálculo de "Registrar pago" (la diferencia se
  reparte entre las cuotas pendientes de la misma venta; sin cuotas restantes se crea una de saldo).
- `src/comisiones.js`: comisión por cuota o por venta; el rol (setter, closer o los dos) se decide fila
  por fila.
- `src/alumnos.js`: estado del alumno.

Si cambias una regla, cambia también su prueba en `tests/` y corre `npm test`.

## Interfaz

| Vista (`activeView`) | Componente |
|---|---|
| `DASHBOARD` | `AnalyticsDashboard` |
| `LEADS` | dentro de `App.jsx` |
| `CONTENT` | `ContentManager` |
| `FINANCE` | `FinanceModule` (Resumen, Historial, Registrar pago, Nuevo alumno, Renovación, Comisiones) |
| `CALLS` | `BookingManager` |
| `DIRECTORY` | `StudentDirectory` |

`AccesoGate` muestra el login y solo deja pasar a quien tiene acceso.

### Estilos

Todo el sistema visual vive en `src/index.css`: tema oscuro neutro con un solo acento (`--accent`) y
tres semánticos (`--positive`, `--warning`, `--negative`). No agregues colores sueltos en `style={{}}`:
usa los tokens o las clases (`panel`, `stat-card`, `badge is-*`, `note is-*`, `btn`, `btn-primary`,
`glass-input`, `field-label`, `grid-stats`, `grid-form`, `split`).

La app se usa también en celular: con 1024 px o menos la barra lateral pasa a ser un menú; con 768 px
o menos las tablas se vuelven tarjetas, y **cada `<td>` necesita su `data-label`** (la primera celda
de la fila hace de título y no lo lleva).
