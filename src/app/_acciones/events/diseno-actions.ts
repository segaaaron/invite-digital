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

// ============================================================================
// El diseño por encargo: el cliente reserva, nos da sus datos y nosotros diseñamos.
//
// Arriba, lo del cliente: enviar sus datos (su equipo también: sección `invitacion`); pedir cambios
// y aprobar, **solo el anfitrión** (sección `equipo`): gastan rondas y deciden sobre lo que pagó. Abajo, lo del equipo (solo el admin): versión enviada, «error nuestro» y empezar.
// ============================================================================

export type DisenoState = { status: 'idle' | 'success' | 'error'; message: string }

const MENSAJE: Record<Exclude<ResultadoDePaso, 'ok'>, string> = {
  sin_encargo: 'Este evento no es de diseño por encargo.',
  paso_invalido: 'Ese paso ya no corresponde. Recarga la página.',
  sin_rondas: 'Ya usaste tus rondas de corrección. Cada cambio adicional se pide como extra.',
  cambiado: 'Alguien acaba de cambiar el estado. Recarga la página.',
}

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
  const actor = await requireSession()
  const eventId = campo(formData, 'eventId')
  await requireEventAccess(actor, { eventId, section: 'invitacion' })
  const evento = await eventoDe(eventId)

  // Lo que el formulario pregunta según el plan (secciones; en Imperial, temática, vestido…). Va
  // antes del paso: si el paso falla, las respuestas quedan guardadas para el siguiente intento.
  const brief = leerBrief((pregunta) => (formData.has(`brief_${pregunta}`) ? campo(formData, `brief_${pregunta}`) : null))
  if (isErr(brief)) return { status: 'error', message: `Cada respuesta puede tener hasta ${MAX_RESPUESTA_DEL_ENCARGO} caracteres. Resume la más larga.` }
  if (Object.keys(brief.value).length > 0) await diseno.guardarBrief(eventId, brief.value)

  const r = await diseno.paso(eventId, 'enviar', { hoy: fechaEnBolivia(new Date()) })
  if (r !== 'ok') return { status: 'error', message: MENSAJE[r] }
  avisarAlAdmin({
    asunto: `${evento?.title ?? 'Un cliente'} envió sus datos para diseñar`,
    lineas: ['Su invitación entra en diseño. Mira la fecha de entrega en su ficha.'],
    ruta: `/panel/eventos/${evento?.slug ?? ''}/configuracion?vista=invitacion`,
  })
  refrescar(evento?.slug)
  return { status: 'success', message: 'Recibimos tus datos. Te avisamos cuando tu invitación esté lista para revisar.' }
}

/** Una ronda = un solo mensaje con todos los cambios juntos. */
export async function pedirCambiosAction(_previo: DisenoState, formData: FormData): Promise<DisenoState> {
  const actor = await requireSession()
  const eventId = campo(formData, 'eventId')
  await requireEventAccess(actor, { eventId, section: 'equipo' })
  const evento = await eventoDe(eventId)

  const mensaje = campo(formData, 'mensaje').trim()
  if (mensaje.length < 5) return { status: 'error', message: 'Escribe todos tus cambios en el mensaje: van juntos en una ronda.' }
  if (mensaje.length > 3000) return { status: 'error', message: 'El mensaje pasa de 3.000 caracteres. Resume o envía lo más importante.' }

  const r = await diseno.paso(eventId, 'cambios', { hoy: fechaEnBolivia(new Date()), mensaje, autor: actor.userId })
  if (r !== 'ok') return { status: 'error', message: MENSAJE[r] }
  avisarAlAdmin({
    asunto: `${evento?.title ?? 'Un cliente'} pidió cambios`,
    lineas: [mensaje.slice(0, 140)],
    ruta: `/panel/eventos/${evento?.slug ?? ''}/configuracion?vista=invitacion`,
  })
  refrescar(evento?.slug)
  return { status: 'success', message: 'Recibimos tus cambios. Te avisamos con la nueva versión.' }
}

export async function aprobarVersionAction(_previo: DisenoState, formData: FormData): Promise<DisenoState> {
  const actor = await requireSession()
  const eventId = campo(formData, 'eventId')
  await requireEventAccess(actor, { eventId, section: 'equipo' })
  const evento = await eventoDe(eventId)

  const r = await diseno.paso(eventId, 'aprobar', { hoy: fechaEnBolivia(new Date()) })
  if (r !== 'ok') return { status: 'error', message: MENSAJE[r] }
  avisarAlAdmin({
    asunto: `${evento?.title ?? 'Un cliente'} aprobó su invitación`,
    lineas: ['Falta el saldo para que pueda repartirla.'],
    ruta: `/panel/admin/eventos?evento=${evento?.slug ?? ''}`,
  })
  refrescar(evento?.slug)
  return { status: 'success', message: '¡Aprobada! En cuanto registremos el saldo, ya puedes repartirla.' }
}

// --- El equipo ---------------------------------------------------------------

export async function versionEnviadaAction(_previo: DisenoState, formData: FormData): Promise<DisenoState> {
  const actor = await requireAdmin()
  const eventId = campo(formData, 'eventId')
  await requireEventAccess(actor, { eventId, section: 'ficha' })
  const evento = await eventoDe(eventId)

  const r = await diseno.paso(eventId, 'version', { hoy: fechaEnBolivia(new Date()) })
  if (r !== 'ok') return { status: 'error', message: MENSAJE[r] }
  await admin.record(actor, { action: 'evento.diseno', subject: evento?.slug ?? eventId, detail: 'versión enviada al cliente' })
  after(async () => {
    await avisos.delEvento(eventId, (ev) => avisoDeVersionLista(ev))
  })
  refrescar(evento?.slug)
  return { status: 'success', message: 'Versión enviada: el cliente ya puede revisarla.' }
}

/** «Error nuestro»: esa ronda no cuenta y se le devuelve al cliente. */
export async function noCuentaAction(_previo: DisenoState, formData: FormData): Promise<DisenoState> {
  const actor = await requireAdmin()
  const eventId = campo(formData, 'eventId')
  await requireEventAccess(actor, { eventId, section: 'ficha' })
  const evento = await eventoDe(eventId)

  if (!(await diseno.noCuenta(eventId, campo(formData, 'rondaId')))) return { status: 'error', message: 'Esa ronda ya no contaba.' }
  await admin.record(actor, { action: 'evento.diseno', subject: evento?.slug ?? eventId, detail: 'ronda devuelta: error nuestro' })
  refrescar(evento?.slug)
  return { status: 'success', message: 'Ronda devuelta al cliente.' }
}

/** Pasa a diseño por encargo un evento que no nació de un pedido por encargo. */
export async function empezarEncargoAction(_previo: DisenoState, formData: FormData): Promise<DisenoState> {
  const actor = await requireAdmin()
  const eventId = campo(formData, 'eventId')
  await requireEventAccess(actor, { eventId, section: 'ficha' })
  const evento = await eventoDe(eventId)

  const rondas = Number(campo(formData, 'rondas'))
  const dias = Number(campo(formData, 'dias'))
  if (!Number.isInteger(rondas) || rondas < 0 || rondas > 20) return { status: 'error', message: 'Las rondas van de 0 a 20.' }
  if (!Number.isInteger(dias) || dias < 1 || dias > 60) return { status: 'error', message: 'Los días de entrega van de 1 a 60.' }
  await diseno.empezar(eventId, { rondas, dias })
  await admin.record(actor, { action: 'evento.diseno', subject: evento?.slug ?? eventId, detail: `por encargo: ${rondas} rondas, ${dias} días` })
  refrescar(evento?.slug)
  return { status: 'success', message: 'Ahora lo diseñamos nosotros: el cliente ve los pasos en su invitación.' }
}
