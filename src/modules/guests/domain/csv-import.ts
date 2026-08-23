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
/**
 * Parte una línea respetando las comillas: «"Familia Rojas; Peña";4» es una etiqueta con
 * punto y coma dentro, no dos columnas. Partir por el separador a secas corre todas las
 * columnas de esa fila y los cupos acaban dentro del nombre.
 */
function partir(linea: string, separador: string): string[] {
  const celdas: string[] = []
  let actual = ''
  let entreComillas = false

  for (let i = 0; i < linea.length; i += 1) {
    const caracter = linea[i]!
    if (caracter === '"') {
      // Dos comillas seguidas dentro de un campo son una comilla literal.
      if (entreComillas && linea[i + 1] === '"') {
        actual += '"'
        i += 1
      } else {
        entreComillas = !entreComillas
      }
      continue
    }
    if (caracter === separador && !entreComillas) {
      celdas.push(actual)
      actual = ''
      continue
    }
    actual += caracter
  }

  celdas.push(actual)
  return celdas.map((c) => c.trim())
}

export function parseGuestCsv(texto: string): ParsedRow[] {
  // Se conserva el número de línea **del archivo**: el informe lo lee alguien con el CSV
  // abierto delante, y una línea que no coincide no sirve para arreglar nada.
  const numeradas = texto
    .split(/\r?\n/)
    .map((linea, indice) => ({ linea, numero: indice + 1 }))
    .filter(({ linea }) => linea.trim() !== '')

  if (numeradas.length === 0) return []

  const separador = detectarSeparador(numeradas[0]!.linea)
  const filas: ParsedRow[] = []

  numeradas.forEach(({ linea, numero }, indice) => {
    const celdas = partir(linea, separador)
    const label = celdas[0] ?? ''
    const cupos = Number(celdas[1] ?? '')
    const phone = (celdas[2] ?? '').trim()

    // Cabecera: primera línea sin número en los cupos **y con más filas detrás**. Un
    // archivo de una sola línea así no es una cabecera: es una fila mal escrita, y
    // saltarla daría «0 creadas, 0 rechazadas» sin explicar nada.
    if (indice === 0 && numeradas.length > 1 && !Number.isFinite(cupos)) return

    const problema =
      label === ''
        ? 'Sin etiqueta'
        : !Number.isInteger(cupos) || cupos < 1
          ? `Cupos inválidos: «${celdas[1] ?? ''}»`
          : null

    filas.push({
      line: numero,
      label,
      seats: Number.isInteger(cupos) ? cupos : 0,
      phone: phone === '' ? null : phone,
      problem: problema,
    })
  })

  return filas
}
