'use server'

import { headers } from 'next/headers'
import { responderEncuesta } from '@/app/composition/container'
import { campo } from '@/shared/forms/campo'
import { clientIpFrom } from '@/shared/http/client-ip'
import { createRateLimiter } from '@/shared/http/rate-limit'
import { registrarFallo } from '@/shared/observability/fallos'

// ============================================================================
// PÚBLICA: la opinión del cliente tras su evento. Sin sesión: se autoriza con el enlace de su
// correo, del que la base solo guarda el hash. Límite de tasa por IP, como todo lo público.
// ============================================================================

const limite = createRateLimiter({ windowMs: 60_000, max: 5 })

export type OpinionState = { status: 'idle' } | { status: 'success' } | { status: 'error'; code: 'rating' | 'failed' | 'rateLimited' }

export async function responderOpinionAction(_previo: OpinionState, formData: FormData): Promise<OpinionState> {
  const bolsa = await headers()
  const ip = clientIpFrom({ realIp: bolsa.get('x-real-ip'), forwardedFor: bolsa.get('x-forwarded-for') })
  if (limite.isLimited(ip, Date.now())) return { status: 'error', code: 'rateLimited' }

  const rating = Number(campo(formData, 'rating'))
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { status: 'error', code: 'rating' }
  const comentario = campo(formData, 'comentario').trim().slice(0, 2000)

  try {
    // Una sola vez: responder dos veces no pisa la primera, y se dice lo mismo que si hubiera ido bien.
    await responderEncuesta(campo(formData, 'token'), { rating, comment: comentario === '' ? null : comentario, allowPublish: formData.get('publicar') === 'on' })
    return { status: 'success' }
  } catch (causa) {
    registrarFallo('events/opinion-actions', 'responderOpinionAction', causa)
    return { status: 'error', code: 'failed' }
  }
}
