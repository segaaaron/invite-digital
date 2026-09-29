'use server'

import { headers } from 'next/headers'
import { leads } from '@/app/composition/container'
import { avisarAlAdmin } from '@/app/_acciones/avisar-al-admin'
import { clientIpFrom } from '@/shared/http/client-ip'
import { guardedSubmit, type ConsultationOutcome } from '@/modules/leads/application/guarded-submit'
import { createRateLimiter } from '@/shared/http/rate-limit'
import { registrarFallo } from '@/shared/observability/fallos'

// ============================================================================
// PÚBLICA: el formulario de contacto de la web, sin sesión y con límite de tasa por IP.
// ============================================================================

export type ConsultationActionState = ConsultationOutcome | { status: 'idle'; message: '' }

const submitGuarded = guardedSubmit({
  limiter: createRateLimiter({ windowMs: 60_000, max: 3 }),
  submit: (payload) => leads.submitConsultation(payload),
  clock: () => Date.now(),
  log: (message, kind, detail) => registrarFallo('leads/actions', message, kind, detail),
})

export async function submitConsultationAction(
  _previous: ConsultationActionState,
  formData: FormData,
): Promise<ConsultationActionState> {
  const headerBag = await headers()
  const ip = clientIpFrom({
    realIp: headerBag.get('x-real-ip'),
    forwardedFor: headerBag.get('x-forwarded-for'),
  })

  const resultado = await submitGuarded({ ip, payload: Object.fromEntries(formData) })
  if (resultado.status === 'success') {
    // Va al asunto del correo: una sola línea, sin saltos que escribió quien consulta.
    const nombre = String(formData.get('name') ?? '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Alguien'
    avisarAlAdmin({
      asunto: `Nueva consulta de ${nombre}`,
      lineas: [`${nombre} escribió desde el formulario de la web. Quien contesta primero se queda la venta.`],
      ruta: '/panel/admin/ventas',
    })
  }
  return resultado
}
