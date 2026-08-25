'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { orders } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { clientIpFrom } from '@/modules/leads/application/client-ip'
import { createRateLimiter } from '@/modules/leads/application/rate-limit'
import { isErr } from '@/shared/result'
import { MAX_PROOF_BYTES } from './domain/proof'

// ============================================================================
// Este fichero tiene DOS bloques, y la diferencia importa.
//
// Arriba, las acciones **públicas**: cualquiera en internet puede llamarlas sin sesión,
// así que van con límite de tasa por IP y validan todo lo que reciben. Abajo, las del
// atelier, que empiezan por `requireSession()`.
//
// Añadir una acción del atelier en el bloque de arriba la dejaría sin sesión.
// ============================================================================

/** Tres pedidos por minuto y por IP. Un formulario público sin freno se llena de basura. */
const limitePedido = createRateLimiter({ windowMs: 60_000, max: 3 })
/** Las subidas son más caras: cada una escribe hasta ocho megas en disco. */
const limiteSubida = createRateLimiter({ windowMs: 60_000, max: 5 })

async function ipDeLaPeticion(): Promise<string> {
  const bolsa = await headers()
  return clientIpFrom({ realIp: bolsa.get('x-real-ip'), forwardedFor: bolsa.get('x-forwarded-for') })
}

export type PlaceOrderState =
  | { status: 'idle' }
  | { status: 'success'; publicRef: string }
  | { status: 'error'; message: string }

export async function placeOrderAction(_previous: PlaceOrderState, formData: FormData): Promise<PlaceOrderState> {
  if (limitePedido.isLimited(await ipDeLaPeticion(), Date.now())) {
    return { status: 'error', message: 'Demasiados pedidos seguidos. Espera un minuto e inténtalo otra vez.' }
  }

  const texto = (clave: string): string => {
    const valor = formData.get(clave)
    return typeof valor === 'string' ? valor : ''
  }

  const fecha = texto('eventDate').trim()

  const result = await orders.place({
    planSlug: texto('planSlug'),
    customerName: texto('customerName'),
    contact: texto('contact'),
    eventDate: fecha === '' ? null : fecha,
    notes: texto('notes'),
  })

  if (isErr(result)) {
    console.error('pedido rechazado', result.error.kind, result.error.detail)
    return {
      status: 'error',
      message:
        result.error.kind === 'invalid_input'
          ? result.error.detail
          : 'No pudimos registrar el pedido. Inténtalo en un momento.',
    }
  }

  return { status: 'success', publicRef: result.value.publicRef }
}

export type UploadProofState = { status: 'idle' } | { status: 'success' } | { status: 'error'; message: string }

const MOTIVO: Record<string, string> = {
  vacio: 'El archivo está vacío.',
  demasiado_grande: `El archivo pasa de ${Math.round(MAX_PROOF_BYTES / 1024 / 1024)} MB.`,
  tipo_no_admitido: 'Solo aceptamos una foto (JPG, PNG o WEBP) o un PDF.',
}

export async function uploadProofAction(_previous: UploadProofState, formData: FormData): Promise<UploadProofState> {
  if (limiteSubida.isLimited(await ipDeLaPeticion(), Date.now())) {
    return { status: 'error', message: 'Demasiados intentos seguidos. Espera un minuto.' }
  }

  const archivo = formData.get('proof')
  const rawRef = formData.get('publicRef')
  if (!(archivo instanceof File) || typeof rawRef !== 'string') {
    return { status: 'error', message: 'Falta el archivo del comprobante.' }
  }

  // El tope se comprueba **antes** de leer el fichero a memoria: `arrayBuffer()` de un
  // archivo de dos gigas se los trae enteros al servidor antes de que nadie lo rechace.
  if (archivo.size > MAX_PROOF_BYTES) return { status: 'error', message: MOTIVO.demasiado_grande! }

  const result = await orders.attachProof({
    rawRef,
    bytes: new Uint8Array(await archivo.arrayBuffer()),
    declaredName: archivo.name,
    declaredType: archivo.type,
  })

  if (isErr(result)) {
    console.error('comprobante rechazado', result.error.kind, result.error.detail)
    if (result.error.kind === 'proof_rejected') {
      return { status: 'error', message: MOTIVO[result.error.detail] ?? 'No pudimos aceptar ese archivo.' }
    }
    return {
      status: 'error',
      message:
        result.error.kind === 'wrong_status'
          ? 'Este pedido ya está aprobado: no hace falta otro comprobante.'
          : 'No pudimos guardar el comprobante. Inténtalo en un momento.',
    }
  }

  revalidatePath(`/panel/pedidos`)
  return { status: 'success' }
}

// ============================================================================
// A partir de aquí, el atelier. Con sesión.
// ============================================================================

export type DecideOrderState = { status: 'idle' } | { status: 'success' } | { status: 'error'; message: string }

export async function decideOrderAction(_previous: DecideOrderState, formData: FormData): Promise<DecideOrderState> {
  await requireSession()

  const orderId = formData.get('orderId')
  const decision = formData.get('decision')
  const note = formData.get('note')

  if (typeof orderId !== 'string' || (decision !== 'approved' && decision !== 'rejected')) {
    return { status: 'error', message: 'Faltan datos de la decisión. Vuelve a cargar la página.' }
  }

  const result = await orders.decide({
    orderId,
    decision,
    note: typeof note === 'string' ? note : '',
  })

  if (isErr(result)) {
    console.error('decisión de pedido rechazada', result.error.kind, result.error.detail)
    return {
      status: 'error',
      message:
        result.error.kind === 'invalid_input'
          ? result.error.detail
          : result.error.kind === 'wrong_status'
            ? 'Ese pedido ya no admite esta decisión. Vuelve a cargar la página.'
            : 'No pudimos guardar la decisión. Inténtalo en un momento.',
    }
  }

  revalidatePath('/panel/pedidos')
  return { status: 'success' }
}
