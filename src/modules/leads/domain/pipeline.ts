import { err, ok, type Result } from '@/shared/result'

/**
 * Los fallos de la bandeja del admin. Van aparte de `LeadError` a propósito: esos tienen
 * un mensaje por clave en el diccionario del formulario público, y estos no salen nunca
 * en la web.
 */
export type InboxErrorKind = 'invalid_transition' | 'missing_note' | 'not_found' | 'conflict' | 'storage_failure'
export type InboxError = { readonly kind: InboxErrorKind; readonly detail: string }
export const inboxError = (kind: InboxErrorKind, detail: string): InboxError => ({ kind, detail })

/**
 * El seguimiento de una consulta de la web: un embudo corto, a propósito.
 *
 * Nueva → contactada → ganada o perdida. Un CRM con cotizada y esperando pago duplicaría lo
 * que ya cuentan los pedidos del Plan B: en cuanto hay pedido, el pedido manda.
 */
export const ESTADOS_CONSULTA = ['new', 'contacted', 'won', 'lost'] as const
export type EstadoConsulta = (typeof ESTADOS_CONSULTA)[number]

export const ETIQUETA_ESTADO: Record<EstadoConsulta, string> = {
  new: 'Nueva',
  contacted: 'Contactada',
  won: 'Ganada',
  lost: 'Perdida',
}

const TRANSICIONES: Record<EstadoConsulta, readonly EstadoConsulta[]> = {
  new: ['contacted', 'won', 'lost'],
  contacted: ['won', 'lost'],
  // Reabrir: quien dijo que no vuelve a escribir. Se retoma donde se dejó.
  lost: ['contacted'],
  // Definitiva: detrás hay una boda. Deshacerla dejaría la venta contada dos veces.
  won: [],
}

export const destinosDesde = (estado: EstadoConsulta): readonly EstadoConsulta[] => TRANSICIONES[estado]

/** Lo que la base no reconoce se lee como nueva: «sin atender» es el lado seguro. */
export const parseEstado = (valor: string): EstadoConsulta =>
  (ESTADOS_CONSULTA as readonly string[]).includes(valor) ? (valor as EstadoConsulta) : 'new'

/**
 * Decide si la consulta puede pasar de un estado a otro.
 *
 * **Perderla exige el motivo**, como rechazar un pedido: sin él, dentro de tres meses nadie
 * sabe si se perdió por precio, por fecha o porque nadie contestó a tiempo.
 */
export function mover(
  desde: EstadoConsulta,
  hacia: EstadoConsulta,
  nota: string,
): Result<{ status: EstadoConsulta; note: string | null }, InboxError> {
  if (!TRANSICIONES[desde].includes(hacia)) {
    return err(inboxError('invalid_transition', `Una consulta ${ETIQUETA_ESTADO[desde].toLowerCase()} no pasa a ${ETIQUETA_ESTADO[hacia].toLowerCase()}.`))
  }

  const limpia = nota.trim()
  if (hacia === 'lost' && limpia.length === 0) {
    return err(inboxError('missing_note', 'Escribe por qué se perdió.'))
  }

  return ok({ status: hacia, note: limpia.length > 0 ? limpia : null })
}

/**
 * Ganadas sobre decididas. Las nuevas y las contactadas no cuentan: todavía pueden ir a
 * cualquiera de los dos lados, y contarlas como perdidas hundiría la cifra cada lunes.
 */
export function tasaDeCierre(conteo: Record<EstadoConsulta, number>): number | null {
  const decididas = conteo.won + conteo.lost
  return decididas === 0 ? null : conteo.won / decididas
}

/**
 * Cuánto vive el dato personal de una consulta. Pasado un año, la consulta no se va a
 * retomar: se queda su estado y sus fechas —la tasa de cierre no se descuadra— y se borra
 * quién era, cómo contactarla, qué escribió y la nota que se tomó sobre ella.
 */
export const RETENCION_CONSULTAS_DIAS = 365

export const NOMBRE_ANONIMO = 'Anónimo'

export const corteDeRetencion = (ahora: Date): Date => new Date(ahora.getTime() - RETENCION_CONSULTAS_DIAS * 86_400_000)
