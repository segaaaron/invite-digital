export type ParsedRow = {
  readonly line: number
  readonly label: string
  readonly seats: number
  readonly phone: string | null
  /** Motivo por el que la fila no sirve. `null` si está bien formada. */
  readonly problem: string | null
}

const SEPARADORES = [';', ',', '\t'] as const

/** El separador que más veces aparece en la primera línea; el punto y coma gana empates. */
function detectarSeparador(primeraLinea: string): string {
  let mejor = ';'
  let veces = -1
  for (const sep of SEPARADORES) {
    const cuenta = primeraLinea.split(sep).length - 1
    if (cuenta > veces) {
      veces = cuenta
      mejor = sep
    }
  }
  return mejor
}

/**
 * Lee un CSV de `etiqueta;cupos;teléfono`.
 *
 * Devuelve **todas** las filas, también las que no sirven, con su motivo: quien importa
 * cincuenta invitados necesita saber cuáles fallaron sin comparar dos listas a mano.
 *
 * Acepta punto y coma, coma o tabulador —Excel exporta con lo que le da la gana según el
 * idioma del sistema— y se salta una cabecera si la primera fila no tiene un número en
 * los cupos.
 */
export function parseGuestCsv(texto: string): ParsedRow[] {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lineas.length === 0) return []

  const separador = detectarSeparador(lineas[0]!)
  const filas: ParsedRow[] = []

  lineas.forEach((linea, indice) => {
    const celdas = linea.split(separador).map((c) => c.trim().replace(/^"|"$/g, ''))
    const label = celdas[0] ?? ''
    const cupos = Number(celdas[1] ?? '')
    const phone = (celdas[2] ?? '').trim()

    // Cabecera: primera línea sin número en los cupos. Se salta en silencio.
    if (indice === 0 && !Number.isFinite(cupos)) return

    const problema =
      label === ''
        ? 'Sin etiqueta'
        : !Number.isInteger(cupos) || cupos < 1
          ? `Cupos inválidos: «${celdas[1] ?? ''}»`
          : null

    filas.push({
      line: indice + 1,
      label,
      seats: Number.isInteger(cupos) ? cupos : 0,
      phone: phone === '' ? null : phone,
      problem: problema,
    })
  })

  return filas
}
