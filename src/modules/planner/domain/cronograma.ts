
/**
 * Un momento del cronograma del día. El equipo lo ve entero; los invitados, solo los marcados
 * `enInvitacion`, que forman el itinerario de la invitación: una sola lista, no dos.
 */
export type Momento = {
  readonly id: string
  /** `HH:MM`, hora de Bolivia. */
  readonly startsAt: string
  readonly durationMin: number
  readonly title: string
  readonly place: string | null
  /** Quién se encarga de que pase. */
  readonly owner: string | null
  readonly vendorIds: readonly string[]
  /** La canción o la señal: lo que el DJ o el maestro de ceremonias necesita saber. */
  readonly cue: string | null
  readonly notes: string | null
  readonly sortOrder: number
  /** Si sale en el itinerario que ven los invitados. */
  readonly enInvitacion: boolean
  /** La clave del dibujo del diseño para ese momento: `corona`, `church`. */
  readonly icono: string | null
}

/**
 * Minutos desde el mediodía, para que una fiesta que cruza la medianoche siga en orden: las
 * 00:30 son después de las 23:45. Antes de las 06:00 cuenta como madrugada de esa noche.
 */
export function minutos(hhmm: string): number {
  const [h, mm] = hhmm.split(':').map(Number) as [number, number]
  const total = h * 60 + mm
  return total < 6 * 60 ? total + 24 * 60 : total
}

export const horaValida = (hhmm: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)

export const MARGEN_MINIMO = 10

export type AvisoDeCronograma = { id: string; tipo: 'se_pisa' | 'margen_corto'; con: string }

/** Momentos que se pisan con el anterior o que dejan menos de diez minutos para moverse. */
export function avisosDelCronograma(momentos: readonly Momento[]): AvisoDeCronograma[] {
  const orden = [...momentos].sort((a, b) => minutos(a.startsAt) - minutos(b.startsAt))
  const avisos: AvisoDeCronograma[] = []
  for (let i = 1; i < orden.length; i++) {
    const antes = orden[i - 1]!
    const este = orden[i]!
    const hueco = minutos(este.startsAt) - (minutos(antes.startsAt) + antes.durationMin)
    if (hueco < 0) avisos.push({ id: este.id, tipo: 'se_pisa', con: antes.title })
    else if (hueco < MARGEN_MINIMO) avisos.push({ id: este.id, tipo: 'margen_corto', con: antes.title })
  }
  return avisos
}

/** Qué momento está pasando a esta hora y cuál viene. Para el Día D. */
export function momentoActual(momentos: readonly Momento[], hhmm: string): { ahora: string | null; sigue: string | null } {
  const t = minutos(hhmm)
  const orden = [...momentos].sort((a, b) => minutos(a.startsAt) - minutos(b.startsAt))
  const ahora = orden.find((x) => minutos(x.startsAt) <= t && t < minutos(x.startsAt) + x.durationMin) ?? null
  const sigue = orden.find((x) => minutos(x.startsAt) > t) ?? null
  return { ahora: ahora?.id ?? null, sigue: sigue?.id ?? null }
}

/** Una fila del itinerario de la invitación. Misma forma que `ItineraryRow` del contenido. */
export type FilaDeItinerario = { readonly time: string; readonly label: string; readonly imageId?: string }

/**
 * El itinerario que ven los invitados, sacado del cronograma: los momentos marcados, en orden
 * de la noche. `null` si no hay ninguno marcado, y entonces manda lo escrito en la invitación.
 */
export function itinerarioDeInvitacion(momentos: readonly Momento[]): FilaDeItinerario[] | null {
  const marcados = momentos.filter((m) => m.enInvitacion).sort((a, b) => minutos(a.startsAt) - minutos(b.startsAt))
  if (marcados.length === 0) return null
  return marcados.map((m) => ({ time: m.startsAt, label: m.title, ...(m.icono === null ? {} : { imageId: m.icono }) }))
}
