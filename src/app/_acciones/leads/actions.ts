'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { admin, leads } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { avisarAlAdmin } from '@/app/_acciones/avisar-al-admin'
import { isErr } from '@/shared/result'
import { ETIQUETA_ESTADO, parseEstado } from '@/modules/leads/domain/pipeline'
import { clientIpFrom } from '@/shared/http/client-ip'
import { guardedSubmit, type ConsultationOutcome } from '@/modules/leads/application/guarded-submit'
import { createRateLimiter } from '@/shared/http/rate-limit'

// ============================================================================
// PÚBLICA: el formulario de contacto de la web, sin sesión y con límite de tasa por IP.
// ============================================================================

export type ConsultationActionState = ConsultationOutcome | { status: 'idle'; message: '' }

const submitGuarded = guardedSubmit({
  limiter: createRateLimiter({ windowMs: 60_000, max: 3 }),
  submit: (payload) => leads.submitConsultation(payload),
  clock: () => Date.now(),
  log: (message, kind, detail) => console.error(message, kind, detail),
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

// ============================================================================
// DEL ADMIN: la bandeja de consultas. Todas empiezan por `await requireAdmin()`, que
// devuelve 404 a quien no lo es. Una consulta no es de ningún evento todavía, así que no
// hay guardia de dueño que pedir.
// ============================================================================

export type InboxActionState = { status: 'idle' } | { status: 'success'; message: string } | { status: 'error'; message: string }

const texto = (formData: FormData, clave: string): string => {
  const valor = formData.get(clave)
  return typeof valor === 'string' ? valor : ''
}

/**
 * Mueve una consulta por el embudo. El estado de destino viaja **en el botón pulsado**
 * (`name="to"`), no en un campo que actualiza un `onClick`: ese `setState` no ha corrido
 * cuando el formulario sale, y «Perdida» habría marcado otra cosa.
 */
export async function moveConsultationAction(_previous: InboxActionState, formData: FormData): Promise<InboxActionState> {
  const actor = await requireAdmin()

  const hacia = parseEstado(texto(formData, 'to'))
  const movida = await leads.move({
    id: texto(formData, 'id'),
    to: texto(formData, 'to'),
    note: texto(formData, 'note'),
    eventId: texto(formData, 'eventId'),
  })

  if (isErr(movida)) {
    if (movida.error.kind === 'storage_failure') {
      console.error('moveConsultationAction', movida.error.detail)
      return { status: 'error', message: 'No pudimos guardar el cambio. Vuelve a intentarlo en un momento.' }
    }
    return { status: 'error', message: movida.error.detail }
  }

  await admin.record(actor, {
    action: 'consulta.estado',
    subject: movida.value.name,
    detail: `${ETIQUETA_ESTADO[movida.value.status]} → ${ETIQUETA_ESTADO[hacia]}`,
  })

  revalidatePath('/panel/admin')
  revalidatePath('/panel/admin/consultas')
  revalidatePath('/panel/admin/ventas')
  revalidatePath('/panel/admin/clientes')
  return { status: 'success', message: `${movida.value.name}: ${ETIQUETA_ESTADO[hacia].toLowerCase()}.` }
}
