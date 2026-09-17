'use server'

import { revalidatePath } from 'next/cache'
import { events, guests, plans } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { env } from '@/shared/config/env'
import { isErr } from '@/shared/result'
import type { GuestErrorKind } from '@/modules/guests/domain/errors'
import { invitationUrl } from '@/modules/guests/domain/invitation-url'
import { loQueFaltaParaInvitar } from '@/modules/events'
import { campo } from '@/shared/forms/campo'
import { normalizarWhatsapp } from '@/shared/whatsapp'

export type RevokeInvitationState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: GuestErrorKind }

/**
 * Devuelve estado, no `void`. Antes registraba el fallo en la consola del servidor y
 * respondía lo mismo tanto si había revocado como si no: el atelier se quedaba creyendo
 * que había cortado el acceso a alguien cuando no lo había cortado.
 *
 * El detalle no cruza —puede llevar identificadores—; cruza la clase, y la pantalla la
 * traduce.
 */
export async function revokeInvitationAction(
  _previous: RevokeInvitationState,
  formData: FormData,
): Promise<RevokeInvitationState> {
  const actor = await requireSession()

  const eventSlug = campo(formData, 'eventSlug')
  const eventId = await requireEventAccess(actor, { eventSlug, section: 'cliente' })

  const result = await guests.revoke({ eventId, id: campo(formData, 'groupId') })
  if (isErr(result)) {
    console.error('revocación rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.kind }
  }

  revalidatePath(`/panel/eventos/${eventSlug}`)
  return { status: 'success' }
}

// ============================================================================
// PERSONAS DEL GRUPO — todas del panel, todas con sesión.
//
// El invitado no toca estas: su enlace confirma cupos, no edita la lista de nombres.
// ============================================================================

export type PersonActionState = { status: 'idle' } | { status: 'success' } | { status: 'error'; message: string }

/**
 * Devuelven estado, no `void`. El tope del cupo se rechaza en el servidor y quien lo
 * intenta tiene que enterarse: si el fallo solo fuera a `console.error`, el atelier
 * creería que cargó a un invitado que la base no tiene, y esa persona aparecería el día
 * del evento sin estar en ninguna lista.
 */
export type GuestActionState = { status: 'idle' | 'success' | 'error'; message: string }

/**
 * El alta de invitado: su invitación, él y sus acompañantes, todo o nada.
 *
 * El tope del plan se resuelve **aquí**, en la frontera, y baja como capacidad: el módulo
 * de invitados no importa `plans`. El evento sale de la guardia, no del formulario.
 */
export async function addGuestAction(_previous: GuestActionState, formData: FormData): Promise<GuestActionState> {
  const actor = await requireSession()

  const eventId = await requireEventAccess(actor, {
    eventId: campo(formData, 'eventId'),
    eventSlug: campo(formData, 'eventSlug'),
    section: 'cliente',
  })
  const eventSlug = campo(formData, 'eventSlug')

  const sinEscribir = await invitacionSinEscribir(eventId)
  if (sinEscribir !== null) return { status: 'error', message: sinEscribir }

  const capacidad = await plans.allowanceFor(eventId)
  const grupos = await guests.list(eventId)
  if (isErr(capacidad) || isErr(grupos)) {
    // Tratar un fallo de lectura como «sin límite» convertiría un error pasajero en un
    // salto del tope del plan.
    console.error('alta de invitado sin capacidad legible')
    return { status: 'error', message: 'No pudimos comprobar el plan del evento. Inténtalo en un momento.' }
  }

  const asistencia = campo(formData, 'attending')
  const result = await guests.addGuest({
    eventId,
    fullName: campo(formData, 'fullName'),
    // Un campo por acompañante, con el mismo nombre: `getAll` los trae en orden.
    companionNames: formData.getAll('companionName').map((v) => String(v)),
    attending: asistencia === '' ? null : (asistencia as 'yes' | 'no' | 'maybe'),
    dietaryNote: campo(formData, 'dietaryNote') || null,
    // Ocho dígitos bolivianos se completan con +591: es como lo escribe todo el mundo aquí y
    // `wa.me` exige el número internacional. Lo que no cuadre se guarda tal cual, sin estorbar.
    phone: telefono(campo(formData, 'phone')),
    email: campo(formData, 'email') || null,
    vip: formData.get('vip') === 'on',
    allowance: { maxGuestGroups: capacidad.value.maxGuestGroups },
    currentGroups: grupos.value.length,
  })

  if (isErr(result)) {
    console.error('alta de invitado rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  revalidatePath(`/panel/eventos/${eventSlug}/invitados`)
  revalidatePath(`/panel/eventos/${eventSlug}`)
  return { status: 'success', message: 'Invitado añadido.' }
}

/** «Añadir acompañante», desde la edición de un invitado: suma una persona a su invitación. */
export async function addPersonAction(input: {
  eventSlug: string
  guestGroupId: string
  fullName: string
}): Promise<PersonActionState> {
  const actor = await requireSession()
  const eventId = await requireEventAccess(actor, { eventSlug: input.eventSlug, section: 'cliente' })

  const result = await guests.addPerson({ eventId, guestGroupId: input.guestGroupId, fullName: input.fullName, isCompanion: true })
  if (isErr(result)) {
    console.error('alta de acompañante rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  revalidatePath(`/panel/eventos/${input.eventSlug}/invitados`)
  return { status: 'success' }
}

export async function updatePersonAction(input: {
  eventSlug: string
  id: string
  fullName?: string
  dietaryNote?: string | null
  vip?: boolean
  attending?: string | null
  email?: string | null
  guestGroupId?: string
}): Promise<PersonActionState> {
  const actor = await requireSession()
  const eventId = await requireEventAccess(actor, { eventSlug: input.eventSlug, section: 'cliente' })

  const { eventSlug, ...patch } = input
  const result = await guests.updatePerson({ ...patch, eventId })

  if (isErr(result)) {
    console.error('edición de persona rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  revalidatePath(`/panel/eventos/${eventSlug}/invitados`)
  return { status: 'success' }
}

export async function removePersonAction(input: { eventSlug: string; id: string }): Promise<PersonActionState> {
  const actor = await requireSession()
  const eventId = await requireEventAccess(actor, { eventSlug: input.eventSlug, section: 'cliente' })

  // Si era la última persona de su invitación, la invitación se va con ella.
  const result = await guests.removePerson({ eventId, id: input.id })
  if (isErr(result)) {
    console.error('baja de persona rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  revalidatePath(`/panel/eventos/${input.eventSlug}/invitados`)
  return { status: 'success' }
}

/**
 * «Permitir corregir»: deja a ese grupo contestar una vez más.
 *
 * Se confirma una sola vez —el enlace circula por el chat de la familia—, así que equivocarse
 * necesitaba salida. Esta es, y pasa por quien lleva el evento.
 */
export async function reopenRsvpAction(input: { eventSlug: string; id: string }): Promise<PersonActionState> {
  const actor = await requireSession()
  const eventId = await requireEventAccess(actor, { eventSlug: input.eventSlug, section: 'cliente' })

  const result = await guests.reopenRsvp({ eventId, id: input.id })
  if (isErr(result)) {
    console.error('no se pudo reabrir la confirmación', result.error.kind, result.error.detail)
    return { status: 'error', message: 'No se pudo reabrir la confirmación.' }
  }

  revalidatePath(`/panel/eventos/${input.eventSlug}/invitados`)
  return { status: 'success' }
}

export type ResendState =
  | { status: 'idle' }
  // El enlace nuevo viaja una sola vez, igual que al crear el grupo. Lleva el `groupId`
  // porque las etiquetas **no son únicas**: «Familia Vega» dos veces es corriente, y
  // buscar por nombre mandaría la invitación de una familia al teléfono de otra.
  | { status: 'success'; groupId: string; label: string; url: string }
  | { status: 'error'; message: string }

/**
 * Vuelve a repartir la invitación de un grupo. **Rota el token**: el enlace anterior deja
 * de abrir nada, y quien lo tuviera —incluido el propio invitado— tendrá que usar el
 * nuevo. La pantalla lo avisa antes de que nadie pulse.
 */
export async function resendInvitationAction(_previous: ResendState, formData: FormData): Promise<ResendState> {
  const actor = await requireSession()
  const eventSlug = campo(formData, 'eventSlug')
  const eventId = await requireEventAccess(actor, { eventSlug, section: 'cliente' })
  return repartir(eventId, eventSlug, formData, 'rotar')
}

/**
 * Enviar la invitación con **su** enlace, sin cambiarlo: lo usan WhatsApp, copiar, correo y
 * SMS. Solo marca el reparto (y acuña uno si la invitación es de antes de guardarlo).
 */
export async function sendInvitationAction(_previous: ResendState, formData: FormData): Promise<ResendState> {
  const actor = await requireSession()
  const eventSlug = campo(formData, 'eventSlug')
  const eventId = await requireEventAccess(actor, { eventSlug, section: 'cliente' })
  return repartir(eventId, eventSlug, formData, 'mismo')
}

/**
 * El enlace de una invitación para **enseñarlo** en el panel: no lo rota ni marca el reparto.
 *
 * Una invitación de antes de `0062` no guardó su enlace y no se puede volver a enseñar; esta acción
 * le acuña uno y conserva el viejo, que sigue abriendo. Así «Editar invitado» siempre tiene un
 * enlace que copiar sin dejar fuera al invitado que ya tiene el suyo.
 */
export async function ensureInvitationLinkAction(input: { eventSlug: string; groupId: string }): Promise<{ status: 'success'; url: string } | { status: 'error'; message: string }> {
  const actor = await requireSession()
  const eventId = await requireEventAccess(actor, { eventSlug: input.eventSlug, section: 'cliente' })
  const result = await guests.enlaceDe({ eventId, id: input.groupId })
  if (isErr(result)) {
    console.error('enlace no disponible', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }
  return { status: 'success', url: invitationUrl(result.value.token, env.SITE_URL) }
}

async function repartir(eventId: string, eventSlug: string, formData: FormData, modo: 'rotar' | 'mismo'): Promise<ResendState> {
  const sinEscribir = await invitacionSinEscribir(eventId)
  if (sinEscribir !== null) return { status: 'error', message: sinEscribir }

  // Preparar el enlace es mandar la invitación: con ella escrita no hace falta que nadie la
  // apruebe. Se publica aquí, antes del enlace, para que abra desde el primer momento.
  await events.publicarSiBorrador(eventId)

  const groupId = campo(formData, 'groupId')
  const result = modo === 'rotar' ? await guests.resend({ eventId, id: groupId }) : await guests.enviar({ eventId, id: groupId })

  if (isErr(result)) {
    console.error('reenvío rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  revalidatePath(`/panel/eventos/${eventSlug}/invitados`)
  return {
    status: 'success',
    groupId,
    label: result.value.label,
    url: invitationUrl(result.value.token, env.SITE_URL),
  }
}

export type ImportState =
  | { status: 'idle' }
  | { status: 'success'; created: number; rejected: number; rows: readonly ImportRowView[] }
  | { status: 'error'; message: string }

export type ImportRowView = {
  line: number
  label: string
  seats: number
  url: string | null
  problem: string | null
}

/**
 * Importa un CSV de invitados y devuelve **la tabla entera**, fila por fila.
 *
 * Un «se importaron 37 de 50» obliga a comparar dos listas a mano para saber cuáles
 * faltan. Aquí cada fila dice si entró, con su enlace, o por qué no.
 */
export async function importGuestsAction(_previous: ImportState, formData: FormData): Promise<ImportState> {
  const actor = await requireSession()

  const eventSlug = campo(formData, 'eventSlug')
  const eventId = await requireEventAccess(actor, { eventId: campo(formData, 'eventId'), eventSlug, section: 'cliente' })

  // Importar la lista es de algunos planes. Esconder el botón no protege: la acción es un
  // extremo HTTP público.
  const sinEscribir = await invitacionSinEscribir(eventId)
  if (sinEscribir !== null) return { status: 'error', message: sinEscribir }

  const incluida = await plans.requireFeature(eventId, 'csvImport')
  if (isErr(incluida)) return { status: 'error', message: incluida.error.detail }

  const capacidad = await plans.allowanceFor(eventId)
  const actuales = await guests.list(eventId)

  // Si cualquiera de las dos lecturas falla, **no se importa**. Tratar el fallo como
  // «sin límite» o «cero grupos» convertiría un error transitorio de base en un salto del
  // tope del plan, en silencio y con cincuenta grupos de golpe. El alta de uno en uno ya
  // corta así; la vía masiva no puede ser la más laxa.
  if (isErr(capacidad) || isErr(actuales)) {
    console.error('importación abortada: no se pudo leer el plan o los grupos actuales')
    return {
      status: 'error',
      message: 'No pudimos comprobar el límite de tu plan. Vuelve a intentarlo en un momento.',
    }
  }

  const result = await guests.importCsv({
    eventId,
    csv: campo(formData, 'csv'),
    allowance: { maxGuestGroups: capacidad.value.maxGuestGroups },
    currentGroups: actuales.value.length,
  })

  if (isErr(result)) {
    console.error('importación rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  revalidatePath(`/panel/eventos/${eventSlug}/invitados`)
  return {
    status: 'success',
    created: result.value.created,
    rejected: result.value.rejected,
    rows: result.value.rows.map((fila) => ({
      line: fila.line,
      label: fila.label,
      seats: fila.seats,
      url: fila.token === null ? null : invitationUrl(fila.token, env.SITE_URL),
      problem: fila.problem,
    })),
  }
}

/**
 * Sin la invitación escrita —quién, cuándo y dónde— no se invita a nadie: el invitado abriría
 * una invitación que no dice de quién es. La pantalla ya apaga los botones; esto es el corte
 * de verdad, porque cada acción es un extremo HTTP público. `null` si está lista.
 */
const invitacionSinEscribir = async (eventId: string): Promise<string | null> => {
  const falta = loQueFaltaParaInvitar(await events.contentFor(eventId, {}))
  return falta.length === 0 ? null : `Antes de invitar, termina tu invitación en Configuración. Falta: ${falta.join(', ').toLowerCase()}.`
}

/** Un teléfono como se escribe aquí: `70012345` se guarda `+59170012345`. Vacío, `null`. */
const telefono = (crudo: string): string | null => {
  const escrito = crudo.trim()
  if (escrito === '') return null
  return normalizarWhatsapp(escrito) || escrito
}

/** El teléfono del grupo, para abrir WhatsApp con el destinatario ya puesto. */
export async function setGroupPhoneAction(input: {
  eventSlug: string
  id: string
  phone: string
}): Promise<PersonActionState> {
  const actor = await requireSession()
  const eventId = await requireEventAccess(actor, { eventSlug: input.eventSlug, section: 'cliente' })

  const limpio = telefono(input.phone)
  try {
    await guests.setPhone(eventId, input.id, limpio)
  } catch (cause) {
    console.error('no se pudo guardar el teléfono', cause)
    return { status: 'error', message: 'No se pudo guardar el teléfono.' }
  }

  revalidatePath(`/panel/eventos/${input.eventSlug}/invitados`)
  return { status: 'success' }
}
