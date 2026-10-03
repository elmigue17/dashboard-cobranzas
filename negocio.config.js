// Configuración del negocio. Es el único lugar donde viven estos datos: el dashboard, los
// scripts y los datos de ejemplo los leen de aquí. INSTALAR.md lo completa con tus respuestas,
// y el porqué de cada decisión queda anotado en NEGOCIO.md.
//
// Si cambias algo, recarga la página del dashboard (con `npm run dev` se recarga sola).

export default {
  // Va en la barra lateral y en la pestaña del navegador.
  nombre: 'Mi Negocio',
  pais: 'Perú',

  // Zona horaria del negocio (formato IANA: America/Lima, America/Mexico_City, America/Bogota,
  // America/Santiago, Europe/Madrid...). De aquí salen "hoy", "ayer" y "este mes".
  zonaHoraria: 'America/Lima',

  // Moneda en la que cobras (código de 3 letras: USD, PEN, MXN, COP, ARS, CLP, EUR...) y el formato
  // de números de tu país (es-PE, es-MX, es-CO, es-AR, es-CL, es-ES...).
  moneda: 'USD',
  formatoRegional: 'es-PE',

  // Lo que vendes. duracionMeses: cuánto dura el acceso. precio: el de lista (se propone al dar de
  // alta, se puede cambiar). cuotas: en cuántas cuotas se suele pagar.
  programas: [
    { nombre: 'Programa Base', duracionMeses: 4, precio: 600, cuotas: 3 },
    { nombre: 'Programa Pro', duracionMeses: 4, precio: 1200, cuotas: 3 },
    { nombre: 'High Ticket', duracionMeses: 6, precio: 3000, cuotas: 3 },
    { nombre: 'Comunidad', duracionMeses: 1, precio: 97, cuotas: 1 },
  ],

  // Quién trae los leads (setters) y quién cierra las ventas (closers). Una persona puede estar en
  // las dos listas.
  equipo: {
    setters: ['Ana', 'Luis'],
    closers: ['Marta', 'Diego'],
  },

  comisiones: {
    setter: 10, // % para quien trajo el lead
    closer: 10, // % para quien cerró la venta
    mismaPersona: 20, // % cuando la misma persona trajo el lead y lo cerró
    // 'cobrado': la comisión se paga sobre cada cuota que entra, el mes en que entra.
    // 'vendido': se paga sobre el total de la venta, el mes en que se vende.
    sobre: 'cobrado',
  },
};
