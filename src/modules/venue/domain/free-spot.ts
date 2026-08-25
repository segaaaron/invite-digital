export type Spot = { readonly x: number; readonly y: number }

/** Cuatro por fila, que es como la maqueta reparte las mesas en el plano. */
const COLUMNAS = 4
const FILAS = 4
const MARGEN_X = 18
const MARGEN_Y = 20
const PASO_X = 21
const PASO_Y = 22

/** Dos mesas a menos de esto se pisan en pantalla, aunque sus coordenadas no coincidan. */
const CERCA = 12

const ocupado = (usados: readonly Spot[], sitio: Spot): boolean =>
  usados.some((u) => Math.abs(u.x - sitio.x) < CERCA && Math.abs(u.y - sitio.y) < CERCA)

/**
 * El primer hueco libre de la rejilla del plano.
 *
 * Sin esto toda mesa nueva nacía en el centro exacto —50, 50—, así que la segunda caía
 * encima de la primera y encima de la pista de baile: el atelier creaba tres mesas y
 * veía una sola, ilegible, con las etiquetas superpuestas.
 */
export function freeSpot(usados: readonly Spot[]): Spot {
  for (let fila = 0; fila < FILAS; fila += 1) {
    for (let columna = 0; columna < COLUMNAS; columna += 1) {
      const sitio = { x: MARGEN_X + columna * PASO_X, y: MARGEN_Y + fila * PASO_Y }
      if (!ocupado(usados, sitio)) return sitio
    }
  }

  // La rejilla está llena: se va escalonando hacia abajo a la derecha, dentro del plano.
  // Es preferible una mesa pegada a otra —que el atelier arrastra— a no poder crearla.
  const extra = Math.max(0, usados.length - COLUMNAS * FILAS)
  return { x: Math.min(95, MARGEN_X + (extra % COLUMNAS) * 6), y: Math.min(95, 88 - (extra % 5) * 3) }
}
