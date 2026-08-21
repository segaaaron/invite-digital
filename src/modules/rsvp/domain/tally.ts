export type RsvpTally = {
  readonly seatsInvited: number
  readonly seatsConfirmed: number
  readonly groupsResponded: number
  readonly groupsPending: number
}

/**
 * `attending: null` significa que el grupo todavía no respondió. Un cero es una
 * respuesta —"no vamos"— y por eso cuenta como respondido: confundirlos haría que el
 * atelier persiguiera a quien ya contestó.
 */
export function tallyOf(rows: ReadonlyArray<{ seats: number; attending: number | null }>): RsvpTally {
  let seatsInvited = 0
  let seatsConfirmed = 0
  let groupsResponded = 0

  for (const row of rows) {
    seatsInvited += row.seats
    if (row.attending === null) continue
    seatsConfirmed += row.attending
    groupsResponded += 1
  }

  return { seatsInvited, seatsConfirmed, groupsResponded, groupsPending: rows.length - groupsResponded }
}
