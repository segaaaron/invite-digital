'use server'

import { revalidatePath } from 'next/cache'
import { admin, events } from '@/app/composition/container'
import { canManageStaff } from '@/modules/identity/domain/access'
import { createCredential } from '@/modules/identity/domain/credential'
import { requireSession } from '@/modules/identity/session-cookie'
import { isErr } from '@/shared/result'

export type StaffActionState =
  | { status: 'idle' }
  | { status: 'success'; message?: string }
  | { status: 'error'; message: string }

// ============================================================================
// El alta y la baja del personal de puerta de un evento.
//
// Las hace **el dueño del evento**, no solo el admin: es quien contrata a su gente y
// quien sabe quién estará esa noche en la puerta. `canManageStaff` lo decide, y se
// comprueba en el servidor.
//
// No llevan `requireEventAccess` porque comprueban algo más estricto —ser el **dueño**,
// no tener acceso—, y están apuntadas como exentas en `verify-tenancy.ts` con ese motivo.
// ============================================================================

const texto = (formData: FormData, clave: string): string => {
  const valor = formData.get(clave)
  return typeof valor === 'string' ? valor : ''
}

async function dueñoDe(formData: FormData) {
  const actor = await requireSession()
  const eventId = texto(formData, 'eventId')
  const eventSlug = texto(formData, 'eventSlug')

  const evento = await events.getByIdFor(actor, eventId)
  if (isErr(evento)) return { error: 'Ese evento ya no existe. Vuelve a cargar la página.' as const }
  if (!canManageStaff(actor, evento.value)) {
    console.error('alta de personal denegada', actor.email, eventSlug)
    return { error: 'No puedes gestionar el personal de este evento.' as const }
  }

  return { actor, eventId, eventSlug }
}

/**
 * Da de alta una pertenencia a este evento.
 *
 * Es la misma operación para la puerta y para el cliente —crear la cuenta si no la hay y
 * atarla a **este** evento—, y por eso vive una sola vez: dos copias serían dos sitios
 * donde olvidarse de que un alta sobre un correo existente **no toca su cuenta**. Cambiar
 * la contraseña de alguien escribiendo su correo sería una forma de robársela.
 */
async function darDeAlta(
  formData: FormData,
  membership: 'puerta' | 'cliente',
  queVe: string,
): Promise<StaffActionState> {
  const contexto = await dueñoDe(formData)
  if ('error' in contexto) return { status: 'error', message: contexto.error }

  const email = texto(formData, 'email').trim().toLowerCase()
  const existente = await admin.findUserByEmail(email)

  if (existente !== null) {
    await events.staff.add(contexto.eventId, existente.id, membership)
    revalidatePath(`/panel/eventos/${contexto.eventSlug}/configuracion`)
    return { status: 'success', message: `${email} ya tenía cuenta: se le dio acceso ${queVe}.` }
  }

  const credencial = createCredential({ email, password: texto(formData, 'password') })
  if (isErr(credencial)) return { status: 'error', message: credencial.error.detail }

  const { id } = await admin.createUser({
    email: credencial.value.email,
    password: credencial.value.password,
    role: membership,
  })
  await events.staff.add(contexto.eventId, id, membership)

  revalidatePath(`/panel/eventos/${contexto.eventSlug}/configuracion`)
  return {
    status: 'success',
    message: `${credencial.value.email} puede entrar con la contraseña que escribiste. No se vuelve a mostrar.`,
  }
}

export async function addDoorStaffAction(_previous: StaffActionState, formData: FormData): Promise<StaffActionState> {
  return darDeAlta(formData, 'puerta', 'a la puerta de este evento')
}

/**
 * Da de alta al cliente: los novios, la quinceañera.
 *
 * Entra a **su** evento y ve lo suyo —invitados, confirmaciones, mesas, regalos,
 * mensajes—, reparte sus enlaces y nada más. No es el dueño del evento: el dueño sigue
 * siendo el atelier que le vendió la invitación, y por eso esto es una pertenencia y no
 * un cambio de `events.user_id`.
 */
export async function addEventClientAction(_previous: StaffActionState, formData: FormData): Promise<StaffActionState> {
  return darDeAlta(formData, 'cliente', 'al panel de este evento')
}

/**
 * Le quita el acceso, sea de la puerta o del cliente.
 *
 * Solo borra la **pertenencia**, nunca la cuenta: esa misma persona puede estar en la
 * puerta de otra boda tuya la semana que viene.
 */
export async function removeDoorStaffAction(_previous: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const contexto = await dueñoDe(formData)
  if ('error' in contexto) return { status: 'error', message: contexto.error }

  await events.staff.remove(contexto.eventId, texto(formData, 'userId'))

  revalidatePath(`/panel/eventos/${contexto.eventSlug}/configuracion`)
  return { status: 'success' }
}
