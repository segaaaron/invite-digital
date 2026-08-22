export type EventStats = {
  readonly groupsInvited: number
  readonly groupsResponded: number
  /** Grupos que dijeron que vienen: al menos un cupo confirmado. */
  readonly groupsAttending: number
  /** Grupos que respondieron cero. Es una respuesta, no un silencio. */
  readonly groupsDeclined: number
  readonly groupsPending: number
  readonly seatsInvited: number
  readonly seatsConfirmed: number

  /**
   * Enteros de 0 a 100, o **`null` cuando no hay nada contra lo que medir**. Un cero
   * diría «el 0 % respondió», que es falso cuando todavía no hay a quién preguntar; y
   * dividir entre cero daría `NaN`, que acabaría pintado en la pantalla.
   */
  readonly attendingPercent: number | null
  readonly declinedPercent: number | null
  readonly pendingPercent: number | null
  readonly respondedPercent: number | null
  readonly seatsConfirmedPercent: number | null

  /** Sin un solo invitado. La vista lo dice con palabras en vez de pintar ceros. */
  readonly empty: boolean
}

/**
 * Reparte 100 puntos entre las partes por el **método del resto mayor**: cada parte se
 * lleva su porcentaje truncado, y los puntos que sobran van a las que tenían el resto
 * más grande.
 *
 * Redondear cada parte por separado no suma 100: tres tercios dan 33 + 33 + 33 = 99, y
 * ese punto que falta se lee en el panel como un dato mal contado.
 */
const repartir = (partes: readonly number[], total: number): number[] => {
  const exactos = partes.map((parte) => (parte / total) * 100)
  const enteros = exactos.map(Math.floor)
  let sobrantes = 100 - enteros.reduce((sum, n) => sum + n, 0)

  const porResto = exactos
    .map((valor, indice) => ({ indice, resto: valor - Math.floor(valor) }))
    .sort((a, b) => b.resto - a.resto)

  for (const { indice } of porResto) {
    if (sobrantes <= 0) break
    enteros[indice] = (enteros[indice] ?? 0) + 1
    sobrantes -= 1
  }

  return enteros
}

/**
 * El embudo del evento a partir de las mismas filas que ya alimentan el contador:
 * invitados, respondieron, confirmaron. **Nada más.**
 *
 * No hay aquí dispositivos ni fuentes de tráfico: eso no se mide en ninguna parte del
 * proyecto, y ponerlo con datos plausibles sería mentir en un panel que alguien va a
 * usar para decidir a quién llamar.
 */
export function eventStatsOf(rows: ReadonlyArray<{ seats: number; attending: number | null }>): EventStats {
  let seatsInvited = 0
  let seatsConfirmed = 0
  let groupsAttending = 0
  let groupsDeclined = 0

  for (const row of rows) {
    seatsInvited += row.seats
    if (row.attending === null) continue
    seatsConfirmed += row.attending
    if (row.attending > 0) groupsAttending += 1
    else groupsDeclined += 1
  }

  const groupsInvited = rows.length
  const groupsResponded = groupsAttending + groupsDeclined
  const groupsPending = groupsInvited - groupsResponded

  if (groupsInvited === 0) {
    return {
      groupsInvited: 0,
      groupsResponded: 0,
      groupsAttending: 0,
      groupsDeclined: 0,
      groupsPending: 0,
      seatsInvited: 0,
      seatsConfirmed: 0,
      attendingPercent: null,
      declinedPercent: null,
      pendingPercent: null,
      respondedPercent: null,
      seatsConfirmedPercent: null,
      empty: true,
    }
  }

  const [attendingPercent = 0, declinedPercent = 0, pendingPercent = 0] = repartir(
    [groupsAttending, groupsDeclined, groupsPending],
    groupsInvited,
  )

  return {
    groupsInvited,
    groupsResponded,
    groupsAttending,
    groupsDeclined,
    groupsPending,
    seatsInvited,
    seatsConfirmed,
    attendingPercent,
    declinedPercent,
    pendingPercent,
    // Lo que respondió es lo que no queda pendiente. Sumando las dos partes por
    // separado el reparto podría no cerrar en 100.
    respondedPercent: 100 - pendingPercent,
    // Un evento cuyos grupos no declaran cupos no tiene contra qué medir los
    // confirmados. Es raro, pero es la división por cero que rompería la pantalla.
    seatsConfirmedPercent: seatsInvited === 0 ? null : Math.round((seatsConfirmed / seatsInvited) * 100),
    empty: false,
  }
}
