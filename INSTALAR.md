# INSTALAR.md · Instrucciones para Claude Code

> **Si eres una persona:** no tienes que seguir esto a mano. Abre Claude Code en una carpeta vacía y
> escríbele: *"Instala este proyecto siguiendo el archivo INSTALAR.md paso a paso: [link del repo]"*.
>
> **Si eres Claude Code:** este archivo es tu guion. Síguelo en orden, paso por paso, sin saltarte
> ninguno y sin adelantarte. Al final de cada paso hay un **Listo cuando**: no pases al siguiente hasta
> que se cumpla.

## Reglas para toda la instalación

1. **Una pregunta por vez.** Haz una pregunta, espera la respuesta y recién ahí la siguiente. Nunca una
   lista de preguntas juntas.
2. **Habla simple.** Español neutro, tuteo, frases cortas. Si usas una palabra técnica (migración,
   RLS, variable de entorno), explícala en una línea la primera vez.
3. **No adivines el negocio.** Si una respuesta no alcanza o algo de los datos no se entiende,
   pregunta. Es preferible preguntar de más que cargar datos mal.
4. **Contraseñas y claves:** nunca las repitas en el chat, nunca las escribas en otro archivo que no sea
   `.env.local` y nunca las subas a ningún lado. Cuando haga falta una, ofrece que la persona la pegue
   ella misma en `.env.local` en lugar de pasarla por el chat.
5. **Nada sale de su computadora sin preguntar.** No crees repos, no publiques, no subas archivos.
   La única conexión es con su Supabase.
6. **Antes de cada comando que cambia algo** (instalar, crear la base, cargar datos), di en una línea qué
   va a hacer. Al terminar cada paso, di en una línea qué quedó hecho.
7. **Si algo falla:** explica qué pasó en palabras simples, busca la solución en
   [Si algo falla](#si-algo-falla) y no sigas hasta resolverlo.
8. **Comandos:** usa los `npm run ...` de este proyecto (funcionan igual en Windows, Mac y Linux).
   Los comandos que se quedan corriendo (`npm run dev`) van en segundo plano.

---

## Paso 0 · Antes de tocar nada

Cuéntale a la persona, en un mensaje corto:

- Qué vas a hacer: bajar el proyecto, hacerle unas preguntas sobre su negocio, crear su base de datos,
  cargar sus datos (o unos de ejemplo), dejar el dashboard andando y mostrárselo. Entre 20 y 40 minutos.
- Qué se va a instalar: las librerías del proyecto (dentro de la carpeta) y, según lo que elija, una
  cuenta gratis de Supabase o Docker Desktop.
- Que sus datos solo van a su propia base de Supabase, que el dashboard no manda nada a ningún otro lado
  y que la base queda cerrada con usuario y contraseña.

Después pregunta: **"Antes de instalar, ¿quieres que revise el código para confirmar que no manda tus
datos a ningún lado y que no tiene claves escondidas?"**

Si dice que sí (cuando el proyecto ya esté bajado, en el paso 1), revísalo de verdad y cuéntale lo que
encontraste, con las rutas de los archivos:

- Busca toda dirección web en `src/`, `scripts/`, `index.html` y `package.json`
  (`http://`, `https://`, `fetch(`, `XMLHttpRequest`, `navigator.sendBeacon`, `<script src`).
  Lo esperable: la app solo usa el cliente de Supabase con la URL de `.env.local`; los datos de
  ejemplo usan direcciones `example.com`, que no existen; `scripts/verificar.mjs` consulta la
  configuración pública de tu propio Supabase.
- Busca claves o tokens escritos en el código (`key`, `token`, `secret`, `password`, `eyJ`,
  `sb_secret`, `sb_publishable`). No tiene que haber ninguno: las claves solo viven en `.env.local`,
  que no se sube a git.
- Mira las dependencias de `package.json`: React, Supabase, iconos (lucide) y las herramientas de
  Vite y ESLint. Nada de analítica ni de rastreo.
- Cuéntale también lo que sí se descarga de internet: las librerías de npm al instalar, la CLI de
  Supabase (`npx supabase`) y, si elige la opción local, las imágenes de Docker de Supabase.

**Listo cuando:** la persona sabe qué va a pasar y, si lo pidió, tiene el resultado de la revisión.

## Paso 1 · Bajar el proyecto e instalarlo

1. Comprueba las herramientas: `node --version` (tiene que ser 20 o más) y `git --version`.
   - Sin Node o con una versión vieja: en Windows `winget install OpenJS.NodeJS.LTS`; en Mac
     `brew install node`; o el instalador de https://nodejs.org (versión LTS). Después hay que cerrar y
     volver a abrir la terminal (y Claude Code).
   - Sin git: en Windows `winget install Git.Git`; en Mac `xcode-select --install`. Si no se puede
     instalar, baja el ZIP desde el botón "Code > Download ZIP" del repo y descomprímelo aquí.
2. Si la carpeta está vacía: `git clone [link] .` (con el punto, para que quede en esta carpeta).
   Si no está vacía, clónalo en una subcarpeta y trabaja desde ahí.
3. `npm install`.
4. Si en el paso 0 pidió la revisión del código, hazla ahora.

**Listo cuando:** `npm install` terminó sin errores (los avisos de "deprecated" no importan).

## Paso 2 · Las preguntas del negocio

Explica en una línea que con estas respuestas se configura el dashboard y que todo queda anotado en
`NEGOCIO.md`, para que cualquier cambio futuro ya sepa cómo es su negocio. Después pregunta, **de a una**:

1. **¿Cómo se llama tu negocio?** (es el nombre que va a aparecer en el dashboard).
2. **¿En qué país está el negocio?** Deduce la zona horaria y confírmala: *"Voy a usar la hora de Lima
   (America/Lima). ¿Está bien?"*. Si el país tiene varias (México, Brasil, Estados Unidos, España,
   Chile), pregunta la ciudad.
3. **¿En qué moneda cobras?** Propón la que corresponde y aclara que, si cobras en dólares aunque estés
   en otro país, se usa dólares.
4. **¿Qué programas vendes?** Para cada uno: nombre, cuántos meses dura el acceso, precio de lista y
   en cuántas cuotas se suele pagar. Acepta la respuesta como venga y después muéstrasela en una tabla
   para que confirme.
5. **¿Quiénes traen los leads (setters) y quiénes cierran las ventas (closers)?** Si alguien hace las
   dos cosas, que aparezca en las dos listas. Si trabaja solo, déjalo vacío: no habrá comisiones.
6. **¿Qué porcentaje se lleva el setter? ¿Y el closer?**
7. **Cuando la misma persona trae el lead y lo cierra, ¿cuánto cobra?** Propón la suma de los dos.
8. **La comisión, ¿se paga sobre la venta o sobre lo cobrado?** Recomienda lo cobrado con esta línea:
   *"Te recomiendo sobre lo cobrado: si un alumno deja de pagar, no pagaste comisión por plata que
   nunca entró."*

Con las respuestas:

- Escribe `negocio.config.js` (ya tiene valores de ejemplo y comentarios: reemplázalos, sin tocar la
  forma del archivo).
- Completa `NEGOCIO.md` (secciones *El negocio*, *Programas* y *Equipo y comisiones*), con las
  respuestas y el porqué de cada decisión, en sus palabras.
- Muéstrale un resumen de lo que quedó y pregunta si está todo bien.

**Listo cuando:** confirmó el resumen. `npm test` tiene que pasar.

## Paso 3 · Dónde vive la base de datos

Explica las dos opciones en pocas líneas y pregunta cuál prefiere:

- **En la nube, con Supabase (plan gratis).** Recomendada si el equipo lo va a usar desde distintos
  lugares o si quiere publicarlo en internet. Hace falta crear una cuenta.
- **En tu computadora, con Docker.** Todo queda en su máquina y solo se usa desde ahí. Hace falta
  instalar Docker Desktop (en Windows puede pedir reiniciar).

### 3A · En la nube (Supabase)

Guíalo **de a una acción por mensaje** y espera su "listo" en cada una:

1. Que entre a https://supabase.com y cree una cuenta (con GitHub o con su email).
2. Que cree un proyecto nuevo (**New project**): nombre (el de su negocio), región (la más cercana:
   South America (São Paulo) para Sudamérica, East US para México y Centroamérica, West EU para
   España) y **Database Password**: que toque **Generate a password**, la copie y la guarde en un
   lugar seguro (un gestor de contraseñas). Plan gratis. Tarda uno o dos minutos en crearse.
3. Crea el archivo `.env.local` copiando `.env.example` (todavía sin valores) y explícale que ahí van
   cuatro datos de su proyecto. Ofrécele dos formas: pegártelos en el chat o pegarlos ella misma en
   `.env.local` (recomendado para la clave secreta y la contraseña). Los datos están en:
   - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`: botón **Connect** arriba del proyecto, o
     **Project Settings > API Keys**: la **Project URL** y la **Publishable key** (si su proyecto
     muestra claves "legacy", la **anon**).
   - `SUPABASE_SERVICE_ROLE_KEY`: **Project Settings > API Keys > Secret keys** (o la **service_role**
     legacy). Explícale que esta es la llave maestra: solo la usan los scripts de su computadora y
     nunca va al navegador.
   - `DATABASE_URL`: botón **Connect > Session pooler** (no "Direct connection", que en muchas redes no
     funciona). Que copie la dirección y reemplace `[YOUR-PASSWORD]` por la contraseña del paso 2.
     Si la contraseña tiene símbolos, hay que escribirlos codificados (`@` es `%40`, `#` es `%23`,
     `/` es `%2F`); lo más simple es que tenga solo letras y números.
4. `npm run db:migrar`. Explica: *"Esto crea las tablas en tu base. Una migración es un archivo con
   las instrucciones para armar la base; están en `supabase/migrations/`"*. Tiene que decir que aplicó
   3 migraciones.
5. Que apague el registro de cuentas nuevas: **Authentication > Sign In / Providers > Allow new users
   to sign up** (apagado) y guarde. Explica por qué: los usuarios los creas tú; y aunque quedara
   prendido, una cuenta nueva no ve nada hasta que le das acceso.

### 3B · En tu computadora (Docker)

1. `docker version`. Si no responde la parte "Server", Docker Desktop no está instalado o no está
   abierto. Para instalarlo: https://www.docker.com/products/docker-desktop/ (en Windows usa WSL 2;
   si lo pide, reinicia). Después que lo abra y espere a que diga que está corriendo.
2. `npm run db:local`. La primera vez baja las imágenes de Supabase (cerca de 2 GB, puede tardar de 5 a
   15 minutos): avísale antes. Crea la base y aplica las migraciones sola.
3. `npm run configurar:local`. Escribe `.env.local` con las claves locales (son claves de desarrollo
   que solo sirven en su computadora).
4. Cuéntale que tiene un panel para ver las tablas en http://127.0.0.1:54423 (Supabase Studio).

### En las dos opciones

1. **Revisa que la base quedó cerrada:** `npm run verificar`. Intenta leer cada tabla sin iniciar
   sesión, como lo haría un extraño. Muéstrale el resultado y explícale qué significa: *"Aunque
   alguien encuentre la dirección de tu base, sin usuario y contraseña no ve nada"*. Si dice
   **ABIERTA**, no sigas: revisa que `npm run db:migrar` haya aplicado las 3 migraciones.
2. **Crea su usuario:** pregunta con qué email va a entrar y corre `npm run usuario -- crear su@email`.
   El comando muestra una contraseña temporal: dísela una sola vez y pídele que la cambie al entrar
   (en la barra lateral, **Contraseña**). No la escribas en ningún archivo.
3. Anota en `NEGOCIO.md` (sección *Dónde vive la base*) qué opción eligió, la URL del proyecto (sin
   claves) y el email del primer usuario.

**Listo cuando:** `npm run verificar` dice "Todo cerrado" y el usuario está creado.

## Paso 4 · Sus datos

Pregunta: **"¿Tienes tus alumnos y pagos en un Sheet, un Excel o un Airtable? ¿O prefieres probar
primero con datos de ejemplo?"**

### Si quiere probar con datos de ejemplo

`npm run datos:ejemplo`. Carga alumnos, ventas, cuotas, leads, llamadas y contenido inventados, con
sus programas, su equipo y su zona horaria, alrededor de la fecha de hoy. Dile que todo es inventado y
qué tres alumnos sirven para probar "Registrar pago" (el comando los muestra). Cuando quiera cargar lo
suyo: `npm run datos:vaciar -- --si` y vuelve a este paso.

### Si tiene sus datos

1. **Que los exporte a CSV** en una carpeta `mis-datos/` dentro del proyecto (créala; git la ignora,
   no se sube nunca):
   - Google Sheets: **Archivo > Descargar > Valores separados por comas (.csv)**. Una vez por pestaña.
   - Excel: **Guardar como > CSV UTF-8**.
   - Airtable: en cada tabla, el menú de la vista (**...**) > **Download CSV**.
2. **Lee cada archivo ENTERO** antes de proponer nada: todas las filas, no solo las primeras. Si es
   largo, léelo por partes hasta el final. Cuenta las filas.
3. **Cuéntale lo que viste:** qué columnas hay, qué parece tener cada una (con un ejemplo real) y lo
   que está desordenado: montos escritos como texto ("88 de 175, RESTAN 87"), varias cosas en una
   celda (programa y precio juntos), fechas en distintos formatos o sin año, columnas vacías, nombres
   repetidos, filas sin monto.
4. **Propón cómo va cada columna** en una tabla: columna del CSV, a qué campo va (alumno, venta o
   cuota, según [docs/IMPORTAR.md](docs/IMPORTAR.md)) y cómo se interpreta. Después haz, **de a una**,
   las preguntas que hagan falta para decidir lo dudoso. Por ejemplo: a qué año corresponden las
   fechas sin año; qué significa una columna como "PIF"; cuáles cuotas están pagadas y cuáles no;
   qué hacer con las filas que no tienen monto; si un programa del CSV que no está en
   `negocio.config.js` hay que agregarlo (con su duración y precio).
5. **Recién con todo confirmado**, escribe un script `mis-datos/convertir.mjs` (node, sin librerías)
   que lea los CSV y escriba `mis-datos/importar.json` con el formato de
   [docs/IMPORTAR.md](docs/IMPORTAR.md). Ponle a cada alumno su `fila` de la planilla, así los avisos
   dicen dónde mirar. Lo que no pueda interpretar va a `no_interpretado` con el motivo; nunca lo
   inventes ni lo descartes en silencio. Que sea un script y no un archivo a mano: así se puede
   corregir y volver a correr.
6. `npm run importar -- mis-datos/importar.json --probar`. Revisa con la persona los **errores**
   (no deja cargar nada) y los **avisos**. Corrige el script y repite hasta que no haya errores y los
   avisos que queden estén entendidos.
7. `npm run importar -- mis-datos/importar.json` (con `--reemplazar` si antes cargó datos de
   ejemplo). Al final muestra cómo quedó la base.
8. **Muéstrale el resultado:** cuántos alumnos, ventas y cuotas quedaron, cuántas cuotas pagadas y
   pendientes, cuánto se cobró y cuánto falta cobrar, y la lista de lo que no se pudo interpretar.
   Después elige dos o tres alumnos de los difíciles y muéstrale, lado a lado, su fila original y
   cómo quedaron sus cuotas, para que confirme que se entendió bien.
9. Anota en `NEGOCIO.md` (sección *Datos importados*) qué archivo se importó, cómo se interpretó cada
   columna, las decisiones que tomó y lo que quedó sin interpretar.

> El importador carga alumnos, ventas y cuotas, que es lo que necesita la parte de cobranzas y
> comisiones. Leads, llamadas y contenido se llenan desde sus herramientas o a mano; si tiene
> planillas de eso, se pueden cargar después (es otro pedido para Claude Code).

**Listo cuando:** la persona vio el resultado y confirmó que los alumnos de prueba quedaron bien.

## Paso 5 · Dejarlo andando y mostrárselo

1. `npm run dev` en segundo plano. Abre http://localhost:5180 en su navegador (en Windows
   `start http://localhost:5180`, en Mac `open http://localhost:5180`).
2. Que entre con su email y la contraseña temporal, y que la cambie (barra lateral > **Contraseña**).
3. Recorrido corto, en un solo mensaje, una línea por sección:
   - **Dashboard:** los números del setter (leads, conversaciones) y del closer (asistencia, cierres).
   - **Leads:** cada prospecto, en qué estado está y de qué pieza de contenido vino.
   - **Contenido:** cada pieza con cuántos leads trajo.
   - **Llamadas:** la agenda del día y lo que contó cada lead antes de la llamada.
   - **Alumnos:** activos, los que vencen en 15 días, congelados y los que se fueron.
   - **Finanzas:** lo cobrado en el mes, lo que falta cobrar, el historial de cuotas, registrar un
     pago (recalcula solo si pagan de menos o de más), alta de alumnos, renovaciones y comisiones.
4. Propón una prueba: registrar un pago de un alumno (con datos de ejemplo, uno de los tres que mostró
   el paso 4) y ver cómo se recalculan las cuotas.
5. Cuéntale cómo se abre la próxima vez: `npm run dev` en esta carpeta (y antes `npm run db:local`
   con Docker Desktop abierto, si eligió la opción local). Y que si quiere un cambio, se lo pida a
   Claude Code en esta carpeta: ya va a saber cómo es su negocio por `NEGOCIO.md`.
6. Termina de completar `NEGOCIO.md` (fecha de instalación, pendientes si quedó alguno).

**Listo cuando:** entró al dashboard con su usuario y vio sus datos.

## Paso 6 (opcional) · Publicarlo para que el equipo lo abra desde cualquier lado

Pregunta si quiere que su equipo lo abra desde cualquier lado. Si no, terminaste.

- Solo funciona con la base en la nube (3A). Si eligió la local, explícale que primero habría que pasar
  la base a Supabase en la nube (es otro pedido).
- Se publica en **Vercel** (plan gratis), directo desde esta carpeta, sin subir el código a GitHub.

1. Que cree una cuenta en https://vercel.com y después un token: **Account Settings > Tokens >
   Create** (nombre "dashboard", vencimiento a su gusto). Que lo pegue cuando lo pidas; no lo guardes
   en ningún archivo.
2. Publica, pasando solo las dos variables públicas (nunca la clave secreta ni `DATABASE_URL`):

   ```bash
   npx vercel deploy --prod --yes --token=EL_TOKEN \
     --build-env VITE_SUPABASE_URL=la_url --build-env VITE_SUPABASE_ANON_KEY=la_clave_publica
   ```

   Al terminar muestra la dirección (`https://algo.vercel.app`). Ábrela y que entre con su usuario.
3. Para cada persona del equipo: `npm run usuario -- crear correo@...` y que cambie la contraseña al
   entrar. Para sacar a alguien: `npm run usuario -- quitar-acceso correo@...`.
4. Anota en `NEGOCIO.md` la dirección publicada y quién tiene acceso.

---

## Si algo falla

| Qué pasa | Qué hacer |
|---|---|
| `npm install` falla | Revisa `node --version` (20 o más). Si es viejo, actualízalo y vuelve a abrir la terminal. |
| `docker version` no muestra "Server" o `db:local` dice que no encuentra Docker | Docker Desktop está cerrado o arrancando: que lo abra y espere a que diga que está corriendo. |
| `db:local` dice que un puerto está en uso | Hay otro Supabase local corriendo. Que lo apague desde su carpeta (`npx supabase stop`) o cambia en `supabase/config.toml` los puertos 54420 a 54429 por otros libres y corre `npm run configurar:local`. |
| `db:migrar` tarda y falla, o dice "could not translate host name" / "network is unreachable" | Está usando la conexión directa: hay que copiar la de **Session pooler**. |
| `db:migrar` dice "password authentication failed" | La contraseña de la base está mal o tiene símbolos sin codificar. Se puede cambiar en **Project Settings > Database > Reset database password** (que la genere de solo letras y números). |
| `verificar` dice ABIERTA | Faltan migraciones: corre `npm run db:migrar` y vuelve a verificar. No cargues datos hasta que diga "Todo cerrado". |
| Al entrar dice "Email o contraseña incorrectos" | `npm run usuario -- nueva-clave su@email` y que pruebe con la nueva. |
| Al entrar dice "Tu usuario todavía no tiene acceso" | `npm run usuario -- dar-acceso su@email`. |
| La página queda en blanco o dice que faltan variables | Revisa `.env.local` y reinicia `npm run dev` (lee el archivo solo al arrancar). |
| El importador marca errores | Corrige `mis-datos/convertir.mjs` (nunca el JSON a mano) y vuelve a correr `--probar`. |
