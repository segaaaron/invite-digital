'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { admin, avisos, diseno, events, type ResultadoDePaso } from '@/app/composition/container'
import { requireAdmin, requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { avisarAlAdmin } from '@/app/_acciones/avisar-al-admin'
import { avisoDeVersionLista } from '@/modules/notifications'
import { leerBrief, MAX_RESPUESTA_DEL_ENCARGO } from '@/modules/events'
import { campo } from '@/shared/forms/campo'
import { fechaEnBolivia } from '@/shared/format/fecha'
import { isErr } from '@/shared/result'
import { tr } from '@/shared/i18n/idioma-servidor'
import type { T } from '@/shared/i18n/t'

// ============================================================================
// El diseño por encargo: el cliente reserva, nos da sus datos y nosotros diseñamos.
//
// Arriba, lo del cliente: enviar sus datos (su equipo también: sección `invitacion`); pedir cambios
// y aprobar, **solo el anfitrión** (sección `equipo`): gastan rondas y deciden sobre lo que pagó. Abajo, lo del equipo (solo el admin): versión enviada, «error nuestro» y empezar.
// ============================================================================

export type DisenoState = { status: 'idle' | 'success' | 'error'; message: string }

const mensajeDe = (t: T): Record<Exclude<ResultadoDePaso, 'ok'>, string> => ({
  sin_encargo: t('Este evento no es de diseño por encargo.', 'This event is not a custom design.'),
  paso_invalido: t('Ese paso ya no corresponde. Recarga la página.', 'That step no longer applies. Reload the page.'),
  sin_rondas: t('Ya usaste tus rondas de corrección. Cada cambio adicional se pide como extra.', 'You have used your revision rounds. Each additional change is requested as an extra.'),
  cambiado: t('Alguien acaba de cambiar el estado. Recarga la página.', 'Someone just changed the status. Reload the page.'),
})

/** El evento, leído **después** de la guardia: quien llega aquí ya tiene acceso. */
async function eventoDe(eventId: string) {
  const evento = await events.getByIdUnscoped(eventId)
  return isErr(evento) ? null : evento.value
}

function refrescar(slug: string | undefined) {
  if (slug !== undefined) revalidatePath(`/panel/eventos/${slug}`, 'layout')
  revalidatePath('/panel/admin')
}

export async function enviarADisenoAction(_previo: DisenoState, formData: FormData): Promise<DisenoState> {
  const t = await tr()
  const actor = await requireSession()
  const eventId = campo(formData, 'eventId')
  await requireEventAccess(actor, { eventId, section: 'invitacion' })
  const evento = await eventoDe(eventId)

  // Lo que el formulario pregunta según el plan (secciones; en Imperial, temática, vestido…). Va
  // antes del paso: si el paso falla, las respuestas quedan guardadas para el siguiente intento.
  const brief = leerBrief((pregunta) => (formData.has(`brief_${pregunta}`) ? campo(formData, `brief_${pregunta}`) : null))
  if (isErr(brief)) return { status: 'error', message: t(`Cada respuesta puede tener hasta ${MAX_RESPUESTA_DEL_ENCARGO} caracteres. Resume la más larga.`, `Each answer can be up to ${MAX_RESPUESTA_DEL_ENCARGO} characters. Shorten the longest one.`) }
  if (Object.keys(brief.value).length > 0) await diseno.guardarBrief(eventId, brief.value)

  const r = await diseno.paso(eventId, 'enviar', { hoy: fechaEnBolivia(new Date()) })
  if (r !== 'ok') return { status: 'error', message: mensajeDe(t)[r] }
  avisarAlAdmin({
    asunto: `${evento?.title ?? 'Un cliente'} envió sus datos para diseñar`,
    lineas: ['Su invitación entra en diseño. Mira la fecha de entrega en su ficha.'],
    ruta: `/panel/eventos/${evento?.slug ?? ''}/configuracion?vista=invitacion`,
  })
  refrescar(evento?.slug)
  return { status: 'success', message: t('Recibimos tus datos. Te avisamos cuando tu invitación esté lista para revisar.', 'We received your details. We’ll let you know when your invitation is ready to review.') }
}

/** Una ronda = un solo mensaje con todos los cambios juntos. */
export async function pedirCambiosAction(_previo: DisenoState, formData: FormData): Promise<DisenoState> {
  const t = await tr()
  const actor = await requireSession()
  const eventId = campo(formData, 'eventId')
  await requireEventAccess(actor, { eventId, section: 'equipo' })
  const evento = await eventoDe(eventId)

  const mensaje = campo(formData, 'mensaje').trim()
  if (mensaje.length < 5) return { status: 'error', message: t('Escribe todos tus cambios en el mensaje: van juntos en una ronda.', 'Write all your changes in the message: they go together in one round.') }
  if (mensaje.length > 3000) return { status: 'error', message: t('El mensaje pasa de 3.000 caracteres. Resume o envía lo más importante.', 'The message is over 3,000 characters. Shorten it or send the most important part.') }

  const r = await diseno.paso(eventId, 'cambios', { hoy: fechaEnBolivia(new Date()), mensaje, autor: actor.userId })
  if (r !== 'ok') return { status: 'error', message: mensajeDe(t)[r] }
  avisarAlAdmin({
    asunto: `${evento?.title ?? 'Un cliente'} pidió cambios`,
    lineas: [mensaje.slice(0, 140)],
    ruta: `/panel/eventos/${evento?.slug ?? ''}/configuracion?vista=invitacion`,
  })
  refrescar(evento?.slug)
  return { status: 'success', message: t('Recibimos tus cambios. Te avisamos con la nueva versión.', 'We received your changes. We’ll let you know with the new version.') }
}

export async function aprobarVersionAction(_previo: DisenoState, formData: FormData): Promise<DisenoState> {
  const t = await tr()
  const actor = await requireSession()
  const eventId = campo(formData, 'eventId')
  await requireEventAccess(actor, { eventId, section: 'equipo' })
  const evento = await eventoDe(eventId)

  const r = await diseno.paso(eventId, 'aprobar', { hoy: fechaEnBolivia(new Date()) })
  if (r !== 'ok') return { status: 'error', message: mensajeDe(t)[r] }
  avisarAlAdmin({
    asunto: `${evento?.title ?? 'Un cliente'} aprobó su invitación`,
    lineas: ['Falta el saldo para que pueda repartirla.'],
    ruta: `/panel/admin/eventos?evento=${evento?.slug ?? ''}`,
  })
  refrescar(evento?.slug)
  return { status: 'success', message: t('¡Aprobada! En cuanto registremos el saldo, ya puedes repartirla.', 'Approved! As soon as we record the balance, you can send it out.') }
}

// --- El equipo ---------------------------------------------------------------

export async function versionEnviadaAction(_previo: DisenoState, formData: FormData): Promise<DisenoState> {
  const t = await tr()
  const actor = await requireAdmin()
  const eventId = campo(formData, 'eventId')
  await requireEventAccess(actor, { eventId, section: 'ficha' })
  const evento = await eventoDe(eventId)

  const r = await diseno.paso(eventId, 'version', { hoy: fechaEnBolivia(new Date()) })
  if (r !== 'ok') return { status: 'error', message: mensajeDe(t)[r] }
  await admin.record(actor, { action: 'evento.diseno', subject: evento?.slug ?? eventId, detail: 'versión enviada al cliente' })
  after(async () => {
    await avisos.delEvento(eventId, (ev) => avisoDeVersionLista(ev))
  })
  refrescar(evento?.slug)
  return { status: 'success', message: t('Versión enviada: el cliente ya puede revisarla.', 'Version sent: the client can now review it.') }
}

/** «Error nuestro»: esa ronda no cuenta y se le devuelve al cliente. */
export async function noCuentaAction(_previo: DisenoState, formData: FormData): Promise<DisenoState> {
  const t = await tr()
  const actor = await requireAdmin()
  const eventId = campo(formData, 'eventId')
  await requireEventAccess(actor, { eventId, section: 'ficha' })
  const evento = await eventoDe(eventId)

  if (!(await diseno.noCuenta(eventId, campo(formData, 'rondaId')))) return { status: 'error', message: t('Esa ronda ya no contaba.', 'That round no longer counted.') }
  await admin.record(actor, { action: 'evento.diseno', subject: evento?.slug ?? eventId, detail: 'ronda devuelta: error nuestro' })
  refrescar(evento?.slug)
  return { status: 'success', message: t('Ronda devuelta al cliente.', 'Round returned to the client.') }
}

/** Pasa a diseño por encargo un evento que no nació de un pedido por encargo. */
export async function empezarEncargoAction(_previo: DisenoState, formData: FormData): Promise<DisenoState> {
  const t = await tr()
  const actor = await requireAdmin()
  const eventId = campo(formData, 'eventId')
  await requireEventAccess(actor, { eventId, section: 'ficha' })
  const evento = await eventoDe(eventId)

  const rondas = Number(campo(formData, 'rondas'))
  const dias = Number(campo(formData, 'dias'))
  if (!Number.isInteger(rondas) || rondas < 0 || rondas > 20) return { status: 'error', message: t('Las rondas van de 0 a 20.', 'Rounds go from 0 to 20.') }
  if (!Number.isInteger(dias) || dias < 1 || dias > 60) return { status: 'error', message: t('Los días de entrega van de 1 a 60.', 'Delivery days go from 1 to 60.') }
  await diseno.empezar(eventId, { rondas, dias })
  await admin.record(actor, { action: 'evento.diseno', subject: evento?.slug ?? eventId, detail: `por encargo: ${rondas} rondas, ${dias} días` })
  refrescar(evento?.slug)
  return { status: 'success', message: t('Ahora lo diseñamos nosotros: el cliente ve los pasos en su invitación.', 'Now we design it: the client sees the steps on their invitation.') }
}
