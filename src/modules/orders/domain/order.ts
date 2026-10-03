import { randomInt } from 'node:crypto'

/**
 * Un pedido del Plan B: alguien eligió plan en la web pública y va a pagar por
 * transferencia.
 *
 * ```
 * pending_payment ──comprobante──► proof_submitted ──┬──► approved
 *                                          ▲         └──► rejected
 *                                          └──otro comprobante──┘
 * ```
 *
 * `rejected` **no es terminal**: se rechaza con una nota —«la transferencia es de otro
 * importe»— y el cliente sube otro comprobante. Un rechazo terminal obligaría a abrir un
 * pedido nuevo y a perder el hilo. `approved` sí lo es.
 *
 * `cancelled` (`0073`) también es terminal: el cliente eligió a otro, cambió la fecha o nunca
 * pagó. Sale del embudo **con su motivo**; sin él, un pedido estancado no tenía salida.
 */
export const ORDER_STATUSES = ['pending_payment', 'proof_submitted', 'approved', 'rejected', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/**
 * Sin `0`, `O`, `1`, `I` ni `L`. La referencia se dicta por teléfono y se copia a mano de
 * una pantalla de celular: los pares que se confunden cuestan una llamada cada uno.
 */
export const PUBLIC_REF_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const PUBLIC_REF_LENGTH = 8

/**
 * Aleatoria, no correlativa. Un `PED-000042` dice cuántos pedidos lleva el atelier —dato
 * de negocio que no tiene por qué salir— y deja adivinar el del vecino, que sí importa:
 * quien tenga la referencia ve el estado y puede subir un comprobante.
 */
export function newPublicRef(): string {
  let ref = ''
  for (let i = 0; i < PUBLIC_REF_LENGTH; i += 1) ref += PUBLIC_REF_ALPHABET[randomInt(PUBLIC_REF_ALPHABET.length)]
  return ref
}

/** Lo que teclea un humano: minúsculas, espacios de sobra. Lo que no case, no es una referencia. */
export function normalizeRef(raw: string): string | null {
  const limpio = raw.replace(/\s+/g, '').toUpperCase()
  if (limpio.length !== PUBLIC_REF_LENGTH) return null
  return [...limpio].every((c) => PUBLIC_REF_ALPHABET.includes(c)) ? limpio : null
}

export function canReceiveProof(status: OrderStatus): boolean {
  return status !== 'approved' && status !== 'cancelled'
}

export function canDecide(status: OrderStatus): boolean {
  return status === 'proof_submitted'
}

/** Se cancela lo que no está cobrado: aprobado es dinero recibido, y cancelado ya lo está. */
export function canCancel(status: OrderStatus): boolean {
  return status !== 'approved' && status !== 'cancelled'
}

/** Se recuerda el pago de lo que espera un pago: sin comprobante o con uno rechazado. */
export function canRemind(status: OrderStatus): boolean {
  return status === 'pending_payment' || status === 'rejected'
}

/** De dónde salió: lo pidió el cliente en la web o lo armó el admin y le mandó el enlace. */
export type OrderOrigin = 'web' | 'cotizacion'
export const parseOrigin = (valor: string): OrderOrigin => (valor === 'cotizacion' ? 'cotizacion' : 'web')

export type QuoteExtra = { readonly slug: string; readonly name: string; readonly cents: number }

/**
 * El anticipo de un precio con el porcentaje del plan, en centavos enteros. `null` sin anticipo
 * (0 % o 100 %): se paga entero de una vez. Se redondea al boliviano: nadie transfiere centavos.
 */
export function anticipoDe(precioCents: number, porcentaje: number): number | null {
  if (!Number.isInteger(porcentaje) || porcentaje <= 0 || porcentaje >= 100) return null
  return Math.round((precioCents * porcentaje) / 100 / 100) * 100
}

/** Lo que el cliente tiene que transferir **ahora**: el anticipo si lo hay y está sin aprobar; si no, todo. */
export function montoAPagar(order: Pick<Order, 'amountCents' | 'depositCents' | 'status' | 'balancePaidAt'>): number | null {
  if (order.amountCents === null) return null
  if (order.depositCents === null) return order.status === 'approved' ? 0 : order.amountCents
  if (order.status !== 'approved') return order.depositCents
  return order.balancePaidAt === null ? order.amountCents - order.depositCents : 0
}

/** Aprobado con anticipo y el saldo todavía sin registrar. */
export const saldoPendiente = (order: Pick<Order, 'amountCents' | 'depositCents' | 'status' | 'balancePaidAt'>): boolean =>
  order.status === 'approved' && order.depositCents !== null && order.amountCents !== null && order.balancePaidAt === null && order.depositCents < order.amountCents

export type Order = {
  readonly id: string
  readonly publicRef: string
  readonly planSlug: string | null
  readonly planName: string | null
  /**
   * El diseño que eligió en el escaparate. Es lo que hace que la invitación que vio sea
   * la que acaba recibiendo: al aprobar el pedido, el evento nace con este tema.
   */
  readonly templateSlug: string | null
  /** El extra que compra, si es un pedido de extra. Entonces no hay plan. */
  readonly addonSlug: string | null
  readonly addonName: string | null
  /**
   * La boda que se creó al aprobarlo, si se creó.
   *
   * Es lo que permite que la bandeja siga diciendo «boda creada» después de recargar: el
   * mensaje de la acción vive en un componente que se desmonta en cuanto el pedido deja de
   * estar «por revisar».
   */
  readonly eventId: string | null
  /** El `slug` de esa boda, para poder enlazarla desde la bandeja. */
  readonly eventSlug: string | null
  readonly customerName: string
  /** El WhatsApp en los pedidos de la web; en los anteriores a `0080`, «WhatsApp o correo». */
  readonly contact: string
  /** El correo del pedido de la web (`0080`). Al aprobarlo, ahí le llega su acceso. */
  readonly email: string | null
  readonly eventDate: string | null
  readonly notes: string | null
  readonly status: OrderStatus
  readonly decisionNote: string | null
  readonly decidedAt: Date | null
  readonly createdAt: Date
  /** El importe congelado al pedirse (`0037`), ya con el descuento de una cotización. */
  readonly amountCents: number | null
  readonly currency: string | null
  /** La consulta de la que salió: consulta y pedido son la misma venta (`0073`). */
  readonly consultationId: string | null
  readonly origin: OrderOrigin
  readonly quoteExtras: readonly QuoteExtra[]
  readonly discountCents: number | null
  /** El anticipo, si el plan lo pide. Con él aprobado nace el evento. */
  readonly depositCents: number | null
  readonly balancePaidAt: Date | null
  readonly remindedAt: Date | null
  readonly cancelReason: string | null
  readonly referralCode: string | null
}
