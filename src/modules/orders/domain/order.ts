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
 */
export const ORDER_STATUSES = ['pending_payment', 'proof_submitted', 'approved', 'rejected'] as const
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
  return status !== 'approved'
}

export function canDecide(status: OrderStatus): boolean {
  return status === 'proof_submitted'
}

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
  readonly contact: string
  readonly eventDate: string | null
  readonly notes: string | null
  readonly status: OrderStatus
  readonly decisionNote: string | null
  readonly decidedAt: Date | null
  readonly createdAt: Date
}
