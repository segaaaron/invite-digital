'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { admin, events, notifications } from '@/app/composition/container'
import { canManageStaff, createCredential } from '@/modules/identity'
import { requireSession } from '@/app/_acciones/sesion'
import { isErr } from '@/shared/result'
import { registrarFallo } from '@/shared/observability/fallos'
import { tr } from '@/shared/i18n/idioma-servidor'
import { traducir } from '@/shared/i18n/en-ingles'

export type StaffActionState =
  | { status: 'idle' }
  | { status: 'success'; message?: string }
  | { status: 'error'; message: string }

// ============================================================================
// El alta y la baja de quien entra a un evento sin ser su dueño: el cliente y el personal
// de puerta.
//
// **Las hace solo el admin.** Lo hacía también el dueño del evento y se cerró a propósito:
// dar de alta **crea una cuenta de usuario** y le manda credenciales por correo, y eso es
// administrar el acceso al sistema, no administrar una boda. `canManageStaff` lo decide y
// se comprueba en el servidor, no escondiendo la tarjeta.
//
// El precio hay que saberlo: la edecán que se contrata la semana de la boda también la da
// de alta el admin, no el atelier que está en el salón.
//
// No llevan `requireEventAccess` porque comprueban algo distinto —ser admin, no tener
// acceso a ese evento—, y están apuntadas como exentas en `verify-tenancy.ts`.
// ============================================================================

const texto = (formData: FormData, clave: string): string => {
  const valor = formData.get(clave)
  return typeof valor === 'string' ? valor : ''
}

async function adminSobre(formData: FormData) {
  const t = await tr()
  const actor = await requireSession()
  const eventId = texto(formData, 'eventId')
  const eventSlug = texto(formData, 'eventSlug')

  // El rol **antes** de tocar la base: a quien no puede gestionar accesos no se le confirma
  // siquiera si ese evento existe.
  if (!canManageStaff(actor)) {
    registrarFallo('events/staff-actions', 'alta de acceso denegada', 'permission_failure', actor.email, eventSlug)
    return { error: t('Solo el administrador da de alta accesos.', 'Only the administrator grants access.') }
  }

  const evento = await events.getByIdFor(actor, eventId, { section: 'ficha' })
  if (isErr(evento)) return { error: t('Ese evento ya no existe. Vuelve a cargar la página.', 'That event no longer exists. Reload the page.') }

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
  const t = await tr()
  const contexto = await adminSobre(formData)
  if ('error' in contexto) return { status: 'error', message: contexto.error }

  const email = texto(formData, 'email').trim().toLowerCase()
  const existente = await admin.findUserByEmail(email)

  // Nombre y teléfono (E34) completan la cuenta; `completarContacto` no pisa lo que ya tenía.
  const nombre = texto(formData, 'nombre').trim()
  const telefono = texto(formData, 'telefono').trim()
  const contacto = (userId: string) =>
    nombre === '' && telefono === '' ? Promise.resolve() : admin.completarContacto(userId, { fullName: nombre === '' ? null : nombre, phone: telefono === '' ? null : telefono })

  if (existente !== null) {
    await events.staff.add(contexto.eventId, existente.id, membership)
    await contacto(existente.id)
    // Ya tenía cuenta: se le avisa, pero **sin contraseña dentro** — no se le ha tocado.
    const avisado = membership === 'cliente' ? await avisarPorCorreo(contexto.eventId, email, null) : false
    revalidatePath(`/panel/eventos/${contexto.eventSlug}/configuracion`)
    return {
      status: 'success',
      message: t(`${email} ya tenía cuenta: se le dio acceso ${queVe}.${avisado ? ' Le avisamos por correo.' : ''}`, `${email} already had an account: they were given access ${queVe}.${avisado ? ' We let them know by email.' : ''}`),
    }
  }

  // La contraseña provisional **se genera**: nadie la inventa ni la escribe (28 de septiembre).
  const credencial = createCredential({ email, password: texto(formData, 'password') || randomBytes(12).toString('base64url') })
  if (isErr(credencial)) return { status: 'error', message: traducir(credencial.error.detail, t) }

  const { id } = await admin.createUser({
    email: credencial.value.email,
    password: credencial.value.password,
    role: membership,
  })
  await events.staff.add(contexto.eventId, id, membership)
  await contacto(id)

  // El correo con su acceso, solo al cliente: el personal de puerta trabaja una noche y se
  // le da la contraseña en mano.
  const avisado =
    membership === 'cliente' ? await avisarPorCorreo(contexto.eventId, credencial.value.email, credencial.value.password) : false

  revalidatePath(`/panel/eventos/${contexto.eventSlug}/configuracion`)
  return {
    status: 'success',
    message: avisado
      ? t(`${credencial.value.email} ya tiene acceso: le mandamos por correo su contraseña provisional, que cambia al entrar.`, `${credencial.value.email} now has access: we emailed them their temporary password, which they change when signing in.`)
      : t(`${credencial.value.email} ya tiene acceso, pero el correo no salió. Pásale esta contraseña provisional, que no se vuelve a mostrar: ${credencial.value.password}`, `${credencial.value.email} now has access, but the email didn’t go out. Give them this temporary password, which won’t be shown again: ${credencial.value.password}`),
  }
}

/**
 * Le manda su acceso por correo.
 *
 * **Nunca falla hacia arriba.** El alta ya está hecha y la contraseña se enseña en
 * pantalla; que el proveedor no responda no puede convertir un alta correcta en un error.
 * Lo que cambia es el mensaje: si no salió, dice que la copie antes de salir.
 */
async function avisarPorCorreo(eventId: string, email: string, password: string | null): Promise<boolean> {
  try {
    // Devuelve un `Result`, no el evento pelado: sin desenvolverlo, `evento.title` es
    // `undefined` en tiempo de ejecución y el correo saldría sin nombre de boda.
    const evento = await events.getByIdUnscoped(eventId)
    if (isErr(evento)) return false

    return await notifications.sendClientAccess({ to: email, password, eventTitle: evento.value.title })
  } catch (causa) {
    registrarFallo('events/staff-actions', 'no se pudo avisar por correo a %s:', email, causa)
    return false
  }
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
  return darDeAlta(formData, 'cliente', (await tr())('al panel de este evento', 'to this event’s panel'))
}

/**
 * Le quita el acceso, sea de la puerta o del cliente.
 *
 * Solo borra la **pertenencia**, nunca la cuenta: esa misma persona puede estar en la
 * puerta de otra boda tuya la semana que viene.
 */
export async function removeDoorStaffAction(_previous: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const contexto = await adminSobre(formData)
  if ('error' in contexto) return { status: 'error', message: contexto.error }

  await events.staff.remove(contexto.eventId, texto(formData, 'userId'))

  revalidatePath(`/panel/eventos/${contexto.eventSlug}/configuracion`)
  return { status: 'success' }
}
