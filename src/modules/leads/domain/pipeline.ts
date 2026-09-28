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
 * Nueva → contactada → ganada o perdida. «Cotizada» o «esperando pago» no son estados de la
 * consulta: son su pedido. La consulta y su pedido son **una venta** (`admin/domain/ventas.ts`) y,
 * en cuanto hay pedido, el pedido manda la etapa.
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
 * Por qué se pierde una venta, de una lista corta (`0073`). Con texto libre, «caro», «precio» y
 * «muy caro» eran tres motivos, y «¿por qué pierdo?» no tenía respuesta sin leer nota por nota.
 */
export const MOTIVOS_DE_PERDIDA = [
  { clave: 'precio', etiqueta: 'Le pareció caro' },
  { clave: 'eligio_a_otro', etiqueta: 'Eligió a otra empresa' },
  { clave: 'no_respondio', etiqueta: 'Dejó de responder' },
  { clave: 'cambio_fecha', etiqueta: 'Cambió o canceló la fecha' },
  { clave: 'otro', etiqueta: 'Otro motivo' },
] as const
export type MotivoDePerdida = (typeof MOTIVOS_DE_PERDIDA)[number]['clave']

export const parseMotivo = (valor: string | null | undefined): MotivoDePerdida | null =>
  MOTIVOS_DE_PERDIDA.find((m) => m.clave === valor)?.clave ?? null

export const etiquetaDeMotivo = (motivo: string | null): string | null => MOTIVOS_DE_PERDIDA.find((m) => m.clave === motivo)?.etiqueta ?? null

/**
 * Decide si la consulta puede pasar de un estado a otro.
 *
 * **Perderla exige el motivo**, como rechazar un pedido: sin él, dentro de tres meses nadie
 * sabe si se perdió por precio, por fecha o porque nadie contestó a tiempo. El motivo es de
 * la lista; «Otro» pide la nota. Sin motivo pero con nota, cuenta como «Otro».
 */
export function mover(
  desde: EstadoConsulta,
  hacia: EstadoConsulta,
  nota: string,
  motivo = '',
): Result<{ status: EstadoConsulta; note: string | null; lostReason: MotivoDePerdida | null }, InboxError> {
  if (!TRANSICIONES[desde].includes(hacia)) {
    return err(inboxError('invalid_transition', `Una consulta ${ETIQUETA_ESTADO[desde].toLowerCase()} no pasa a ${ETIQUETA_ESTADO[hacia].toLowerCase()}.`))
  }

  const limpia = nota.trim()
  const elegido = parseMotivo(motivo)
  if (hacia === 'lost') {
    if (elegido === null && limpia.length === 0) return err(inboxError('missing_note', 'Elige por qué se perdió.'))
    if (elegido === 'otro' && limpia.length === 0) return err(inboxError('missing_note', 'Cuenta en la nota cuál fue el motivo.'))
  }

  return ok({ status: hacia, note: limpia.length > 0 ? limpia : null, lostReason: hacia === 'lost' ? (elegido ?? 'otro') : null })
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
