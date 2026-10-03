// Duración en meses de cada programa. La usan el alta, la renovación y la pestaña Alumnos,
// así que tiene que vivir en un solo lugar.
export const PROGRAM_DURATION = { 'Programa Base': 4, 'Programa Pro': 4, 'High Ticket': 6, 'Comunidad': 1 };

export const PROGRAM_OPTIONS = Object.keys(PROGRAM_DURATION);

const DURACION_POR_DEFECTO = 4;

/** Meses que dura un programa. Si no está en la lista, la duración por defecto. */
export const duracionDePrograma = (programa) => PROGRAM_DURATION[programa] ?? DURACION_POR_DEFECTO;
