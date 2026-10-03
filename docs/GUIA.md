# Guía de uso para el equipo

Cómo se usa el dashboard en el día a día. Para instalarlo, ver [INSTALAR.md](../INSTALAR.md).

## Entrar

Cada persona entra con su email y su contraseña. Los usuarios los crea quien administra el dashboard
(`npm run usuario -- crear correo@...`). La primera vez se entra con una contraseña temporal: cámbiala en
la barra lateral, en **Contraseña**. **Salir** cierra la sesión.

## Lo de todos los días

### Cuando entra un pago

**Finanzas > Registrar pago.** Busca al alumno, elige la cuota, escribe lo que pagó de verdad y la
fecha en que entró la plata. Si tienes el comprobante, súbelo (imagen o PDF).

- **Si pagó lo justo:** la cuota queda pagada y listo.
- **Si pagó de menos:** lo que faltó se reparte entre las cuotas que le quedan de esa venta. Antes de
  confirmar, el aviso amarillo te muestra cómo quedan.
- **Si pagó de más:** lo que sobró se descuenta de las cuotas que le quedan.
- **Si pagó de menos en su última cuota:** se crea una cuota nueva por el saldo, a un mes.
- **Si paga más de lo que debe en total:** no te deja registrarlo. Revisa el monto.

La fecha de pago importa: de ella depende en qué mes se paga la comisión.

### Cuando se vende

**Finanzas > Nuevo alumno.** Datos de contacto, programa (se completan solos el precio y las cuotas
habituales; puedes cambiarlos), fecha de inicio, lo que pagó en la llamada (si pagó algo, esa es la
cuota 1 y queda pagada), y quién trajo el lead y quién cerró. Abajo ves cómo quedan las cuotas antes
de confirmar.

**Finanzas > Renovación** es lo mismo para alguien que ya es alumno: le crea una venta nueva con sus
cuotas y le actualiza el programa y las fechas.

### Cuando hay que corregir algo

**Finanzas > Historial.** Busca la cuota y toca el lápiz: puedes cambiar el estado (Pendiente, Pagado,
Incobrable), el monto, la fecha de pago y el comprobante.

## Alumnos

- **Activo, Por vencer (15 días o menos) y Vencido** se calculan solos con la fecha de fin.
- **Congelar:** abre al alumno y toca **Congelar programa**. Cuando vuelve, **Descongelar**: la fecha
  de fin se corre los días que estuvo congelado.
- **Dar de baja:** doble clic en su estado y elige **Churneado**.
- Doble clic en **Inicio** o **Duración** para corregirlos; la fecha de fin se recalcula.

## Fin de mes: comisiones

**Finanzas > Comisiones.** Abre en el mes anterior. Cada tarjeta es una persona, con lo que le toca y de
dónde sale (por ejemplo, "Setter · 10% de $ 3.000"). Si alguien trajo y cerró la misma venta, esa parte
va al porcentaje de "misma persona". La tabla de abajo muestra cuota por cuota.

Cuando lo revisaste, toca **Calcular y guardar**: queda registrado en cada cuota cuánto le tocó a cada
uno.

Los porcentajes, y si se pagan sobre lo cobrado o sobre lo vendido, están en `negocio.config.js`. Para
cambiarlos, pídeselo a Claude Code.

## Leads, contenido y llamadas

- **Leads:** el estado de cada conversación (frío, en conversación, interesado, agendado, cerrado o
  perdido). Se cambia desde la lista o desde el detalle, y cada cambio queda registrado para las
  métricas del Dashboard.
- **Contenido:** cada pieza con su código (C para carrusel, R para reel, H para historia, más la fecha:
  `C_21_04`). El código tiene que ser el mismo que manda tu herramienta de mensajes cuando entra un
  lead, así se sabe qué pieza lo trajo.
- **Llamadas:** la agenda del día. Después de cada llamada, marca si asistió, el resultado y si
  calificaba: de eso salen las métricas del closer.

Leads y llamadas se cargan desde tus herramientas (por ejemplo, un formulario de agenda o tu
herramienta de mensajes). Si quieres que entren solos, pídele a Claude Code que arme esa conexión.

## Dashboard

- **Setter:** leads nuevos, conversaciones abiertas y activas del período.
- **Alertas:** interesados que todavía no agendaron y conversaciones sin respuesta hace más de 48 horas.
- **Closer:** de las llamadas del período, cuántas se presentaron (show rate), cuántas calificaban y
  cuántas cerraron.

Todas las fechas ("hoy", "ayer", "este mes") se cuentan en la zona horaria del negocio.
