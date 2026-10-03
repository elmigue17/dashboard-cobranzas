# Dashboard de cobranzas y comisiones

Un dashboard para negocios que venden programas en cuotas (academias, mentorías, coaching). Sabe quién
te pagó y quién no, en qué cuota va cada alumno, recalcula solo cuando alguien paga de menos o de más,
y a fin de mes te dice cuánto le toca a cada setter y a cada closer.

Lo instala Claude Code por ti: te pregunta cómo es tu negocio, crea tu base de datos, carga tu planilla
y te deja todo andando.

## Qué muestra cada sección

- **Dashboard:** los números del día del setter (leads nuevos, conversaciones) y del closer (de las
  llamadas agendadas, cuántas se presentaron y cuántas cerró).
- **Leads:** cada prospecto, en qué estado de la conversación está y de qué pieza de contenido vino.
- **Contenido:** cada reel, carrusel o historia con cuántos leads trajo.
- **Llamadas:** la agenda del día y, de cada lead, lo que contó antes de la llamada (dolores, ingresos,
  capacidad económica). Después de la llamada se marca si asistió, si calificaba y si compró.
- **Alumnos:** activos, a quién se le termina el programa en 15 días, congelados y los que se fueron.
  Si alguien congela, la fecha de fin se corre sola.
- **Finanzas:** lo cobrado en el mes, lo que falta cobrar y lo incobrable; el historial de cuotas con
  sus comprobantes; registrar un pago (si pagan de menos o de más, las cuotas que quedan se recalculan
  solas); alta de alumnos y renovaciones; y las comisiones del mes, sobre lo cobrado o sobre lo vendido.

## Cómo se instala

Necesitas:

- **[Claude Code](https://claude.com/claude-code)** (con el plan Pro alcanza para instalarlo).
- **Una cuenta gratis de [Supabase](https://supabase.com)** para la base de datos, o **[Docker
  Desktop](https://www.docker.com/products/docker-desktop/)** si prefieres que todo quede en tu
  computadora.
- Tu planilla de alumnos y pagos exportada a CSV (Google Sheets, Excel o Airtable). Si todavía no la
  tienes, puedes probar con datos de ejemplo.

Abre Claude Code en una carpeta vacía y escríbele:

> Instala este proyecto siguiendo el archivo INSTALAR.md paso a paso: [LINK DE ESTE REPO]

Dile que siga el archivo **paso a paso**: así te pregunta cómo es tu negocio en lugar de adivinarlo.
Todo lo que contestes queda anotado en `NEGOCIO.md`, y cuando más adelante le pidas un cambio (otro
porcentaje, un programa nuevo, una pestaña que hoy no existe) ya sabe cómo funciona tu negocio.

## Privacidad

- **Tus datos son tuyos.** Viven en tu propio proyecto de Supabase (o en tu computadora). El dashboard
  no manda nada a ningún otro lado: no tiene analítica, ni rastreo, ni claves escondidas. Si quieres,
  pídele a Claude Code que lo revise antes de instalar.
- **La base queda cerrada.** Sin iniciar sesión no se ve ni una fila, y solo entran los usuarios que tú
  agregas. `npm run verificar` lo comprueba intentando leer cada tabla como lo haría un extraño.
- **Los comprobantes de pago** se guardan en un espacio privado: se abren con un link que vence a los
  10 minutos.
- **Te llevas todo cuando quieras:** `npm run exportar` deja cada tabla en un CSV.

## Si ya lo tienes instalado

| Para | Corre |
|---|---|
| Abrir el dashboard | `npm run dev` y entra a http://localhost:5180 |
| Encender la base local (solo si elegiste Docker) | `npm run db:local` |
| Dar acceso a alguien del equipo | `npm run usuario -- crear correo@...` |
| Revisar que la base sigue cerrada | `npm run verificar` |
| Ver un resumen de lo que hay en la base | `npm run resumen` |
| Exportar todo a CSV | `npm run exportar` |

La guía de uso para el equipo está en [docs/GUIA.md](docs/GUIA.md).

---

Hecho por Miguel Pozo · Zolvinta ([zolvinta.com](https://zolvinta.com))

¿Prefieres que te lo deje funcionando en tu negocio? Escríbeme por WhatsApp: https://wa.me/51918324015

Licencia MIT: puedes usarlo, cambiarlo y compartirlo (ver [LICENSE](LICENSE)).
