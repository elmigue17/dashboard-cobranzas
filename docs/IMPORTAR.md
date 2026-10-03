# Formato para importar tus datos

`npm run importar` carga alumnos, ventas y cuotas desde un archivo JSON con este formato. Ese archivo no
lo escribes tú: lo arma Claude Code a partir de tu planilla exportada a CSV, después de mostrarte cómo
entendió cada columna (ver el paso 6 de [INSTALAR.md](../INSTALAR.md)).

## Cómo se usa

```bash
npm run importar -- mis-datos/importar.json --probar      # revisa todo y muestra qué cargaría, sin cargar
npm run importar -- mis-datos/importar.json               # carga (si la base no tiene datos)
npm run importar -- mis-datos/importar.json --reemplazar  # borra los datos del negocio y carga estos
npm run importar -- mis-datos/importar.json --agregar     # suma estos a los que ya hay
npm run resumen                                           # cómo quedó la base
```

- **Errores**: algo que no se puede cargar (un monto que no es número, una fecha que no existe). Si hay
  uno solo, no se carga nada.
- **Avisos**: se carga igual, pero conviene mirarlo (las cuotas no suman el total de la venta, un programa
  que no está en `negocio.config.js`, una cuota pagada sin fecha de pago).
- Si la carga falla a mitad de camino, se borra lo que alcanzó a entrar: o entra todo o no entra nada.
- No toca los usuarios ni la lista de acceso.

## El archivo

```json
{
  "alumnos": [
    {
      "nombre": "Nombre Apellido",
      "email": "correo@ejemplo.com",
      "telefono": "+51 999 999 999",
      "estado": "Pausado",
      "congelado_desde": "2026-09-20",
      "fecha_baja": null,
      "dias_congelados": 0,
      "notas": "Lo que no entra en otra columna",
      "ventas": [
        {
          "programa": "Programa Trimestral",
          "monto": 900,
          "fecha_venta": "2026-06-03",
          "fecha_inicio": "2026-06-03",
          "duracion_meses": 3,
          "setter": "Ana",
          "closer": "Marta",
          "es_renovacion": false,
          "notas": "Pagó la mitad por transferencia y la mitad en efectivo",
          "cuotas": [
            { "monto": 450, "vence": "2026-06-03", "estado": "Pagado", "pagada_el": "2026-06-03" },
            { "monto": 450, "vence": "2026-07-03", "estado": "Pendiente" }
          ]
        }
      ]
    }
  ],
  "no_interpretado": [
    { "fila": 12, "motivo": "La columna de saldo dice 'ver con Marta': no se sabe cuánto debe" }
  ]
}
```

### Alumno

| Campo | Obligatorio | Qué es |
|---|---|---|
| `nombre` | sí | Nombre y apellido. |
| `email`, `telefono`, `notas` | no | Texto libre. |
| `estado` | no | Solo hace falta para `Pausado` (congelado) o `Churneado` (se dio de baja). `Activo`, `Por vencer` y `Vencido` se calculan solos con la fecha de fin. |
| `congelado_desde` | no | Si hoy está congelado, desde qué fecha. |
| `fecha_baja` | no | Si se dio de baja, cuándo. |
| `dias_congelados` | no | Días que estuvo congelado antes (corren la fecha de fin). |
| `ventas` | sí, salvo que no tenga | Lo que compró. Un alumno con una renovación tiene dos ventas. |

El programa, las fechas y el equipo del alumno salen de su venta más reciente.

### Venta

| Campo | Obligatorio | Qué es |
|---|---|---|
| `programa` | sí | Conviene que se escriba igual que en `negocio.config.js`. |
| `monto` | sí | El total vendido, no lo cobrado. |
| `fecha_venta` | sí | Cuándo se vendió (si no se sabe, la de inicio). |
| `fecha_inicio` | no | Cuándo empieza el acceso. Si falta, la de venta. |
| `duracion_meses` | no | Si falta, la del programa en `negocio.config.js`. |
| `setter`, `closer` | no | Tal como están en `negocio.config.js`, para que las comisiones no se partan. |
| `es_renovacion` | no | `true` si es una renovación. Si falta, toda venta después de la primera cuenta como renovación. |
| `cuotas` | sí | Al menos una. Si se pagó entera, una sola cuota `Pagado` por el total. |

### Cuota

| Campo | Obligatorio | Qué es |
|---|---|---|
| `monto` | sí | Lo que vale esa cuota. Si ya se pagó, lo que entró de verdad. |
| `vence` | sí | Fecha de vencimiento. |
| `estado` | no | `Pendiente` (por defecto), `Pagado` o `Incobrable`. |
| `pagada_el` | si está pagada | Fecha en que entró la plata. Si falta, se usa la de vencimiento y avisa. De esta fecha depende en qué mes se paga la comisión. |
| `n` | no | Número de cuota. Si falta, se numeran por fecha de vencimiento. |
| `notas` | no | Texto libre. |

**Todas las fechas van como `AAAA-MM-DD`** (por ejemplo `2026-03-15`). Si la planilla tiene fechas sin
año ("15/03"), hay que decidir el año con la persona antes de armar el archivo.

### Lo que no se pudo interpretar

`no_interpretado` es una lista de lo que Claude Code no supo cómo cargar (una fila sin monto, un saldo
escrito como "ver con Marta"). No se carga: se muestra al final para que lo revises a mano.
