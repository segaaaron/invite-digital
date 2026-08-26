'use server'

import { revalidatePath } from 'next/cache'
import { admin, events } from '@/app/composition/container'
import { createCredential } from '@/modules/identity/domain/credential'
import { parseRole } from '@/modules/identity/domain/access'
import { requireAdmin } from '@/modules/identity/session-cookie'
import { isErr } from '@/shared/result'

// ============================================================================
// TODAS las acciones de este fichero empiezan por `await requireAdmin()`, que redirige a
// la puerta sin sesión y devuelve **404** a quien tiene sesión y no es admin. 404 y no
// 403: un 403 confirmaría que la administración existe, y para quien no es admin no
// existe.
//
// Ninguna lleva `requireEventAccess`, y es a propósito: el admin opera **por definición**
// sobre eventos que no son suyos. Están apuntadas como exentas en `verify-tenancy.ts`.
// ============================================================================

export type AdminActionState = { status: 'idle' } | { status: 'success'; message?: string } | { status: 'error'; message: string }

const refrescar = () => {
  revalidatePath('/panel/admin')
  revalidatePath('/panel/admin/usuarios')
  revalidatePath('/panel/admin/eventos')
  revalidatePath('/panel/admin/auditoria')
}

const texto = (formData: FormData, clave: string): string => {
  const valor = formData.get(clave)
  return typeof valor === 'string' ? valor : ''
}

/**
 * Alta de usuario.
 *
 * La contraseña inicial la escribe el admin y **se enseña una sola vez**, como los
 * enlaces de invitado: de ella solo queda su argon2.
 */
export async function createUserAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const credencial = createCredential({ email: texto(formData, 'email'), password: texto(formData, 'password') })
  if (isErr(credencial)) return { status: 'error', message: credencial.error.detail }

  if (await admin.findUserByEmail(credencial.value.email)) {
    return { status: 'error', message: `Ya existe un usuario con el correo ${credencial.value.email}.` }
  }

  const role = parseRole(texto(formData, 'role'))
  await admin.createUser({ email: credencial.value.email, password: credencial.value.password, role })
  await admin.record(actor, { action: 'usuario.alta', subject: credencial.value.email, detail: role })

  refrescar()
  return { status: 'success', message: `Usuario ${credencial.value.email} creado como ${role}.` }
}

export async function setUserRoleAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const result = await admin.setRole(actor, { userId: texto(formData, 'userId'), role: parseRole(texto(formData, 'role')) })
  if (isErr(result)) {
    console.error('cambio de rol rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  refrescar()
  return { status: 'success' }
}

export async function deleteUserAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const result = await admin.deleteUser(actor, texto(formData, 'userId'))
  if (isErr(result)) {
    console.error('borrado de usuario rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  refrescar()
  return { status: 'success' }
}

/** Reasignar el dueño de un evento. Es la salida cuando hay que borrar a alguien. */
export async function reassignEventAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const eventId = texto(formData, 'eventId')
  const userId = texto(formData, 'userId')
  if (eventId === '' || userId === '') return { status: 'error', message: 'Faltan datos. Vuelve a cargar la página.' }

  const evento = await events.getByIdFor(actor, eventId)
  if (isErr(evento)) return { status: 'error', message: 'Ese evento ya no existe. Vuelve a cargar la página.' }

  await events.setOwner(eventId, userId)
  await admin.record(actor, { action: 'evento.reasignado', subject: evento.value.slug, detail: userId })

  refrescar()
  return { status: 'success' }
}

export async function setEventPlanAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const result = await admin.setEventPlan(actor, {
    eventId: texto(formData, 'eventId'),
    eventSlug: texto(formData, 'eventSlug'),
    planSlug: texto(formData, 'planSlug'),
  })
  if (isErr(result)) {
    console.error('cambio de plan rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  refrescar()
  return { status: 'success' }
}

/**
 * Borrar el evento de cualquiera.
 *
 * Pide escribir el `slug` como confirmación, igual que la zona de peligro del propio
 * evento: se lleva por delante invitados, mesas, regalos y mensajes, y no se deshace.
 */
export async function deleteEventAsAdminAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const eventId = texto(formData, 'eventId')
  const evento = await events.getByIdFor(actor, eventId)
  if (isErr(evento)) return { status: 'error', message: 'Ese evento ya no existe. Vuelve a cargar la página.' }

  const result = await events.remove({ eventId, confirmation: texto(formData, 'confirmation') })
  if (isErr(result)) {
    console.error('borrado de evento por admin rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  await admin.record(actor, { action: 'evento.borrado', subject: evento.value.slug, detail: evento.value.title })

  refrescar()
  return { status: 'success' }
}

// ============================================================================
// DATOS DE COBRO DEL PLAN B
//
// El QR de cobro **no lo generamos**: en Bolivia lo emite el sistema financiero y los
// códigos van cifrados y firmados por el banco. Aquí solo se guarda la imagen que el
// administrador exporta de su aplicación bancaria.
// ============================================================================

export async function savePaymentSettingsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const result = await admin.savePayment(actor, {
    bank: texto(formData, 'bank'),
    accountHolder: texto(formData, 'accountHolder'),
    accountNumber: texto(formData, 'accountNumber'),
    notes: texto(formData, 'notes'),
  })

  if (isErr(result)) {
    console.error('datos de cobro rechazados', result.error.kind, result.error.detail)
    return { status: 'error', message: 'No pudimos guardar los datos. Inténtalo en un momento.' }
  }

  refrescar()
  revalidatePath('/es/pedido', 'layout')
  return { status: 'success', message: 'Datos de cobro guardados.' }
}

const QR_MIMES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_QR_BYTES = 2 * 1024 * 1024

export async function uploadPaymentQrAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const archivo = formData.get('qr')
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { status: 'error', message: 'Elige la imagen del QR.' }
  }
  // El tope se comprueba antes de leer el fichero a memoria, como en los comprobantes.
  if (archivo.size > MAX_QR_BYTES) {
    return { status: 'error', message: 'La imagen pasa de 2 MB. Exporta el QR más pequeño.' }
  }

  const bytes = new Uint8Array(await archivo.arrayBuffer())
  const mime = sniffImage(bytes)
  if (mime === null) {
    return { status: 'error', message: 'Solo aceptamos una imagen PNG, JPG o WEBP.' }
  }

  const result = await admin.savePaymentQr(actor, { bytes, mime })
  if (isErr(result)) {
    console.error('QR de cobro rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: 'No pudimos guardar la imagen. Inténtalo en un momento.' }
  }

  refrescar()
  revalidatePath('/es/pedido', 'layout')
  return { status: 'success', message: 'QR de cobro actualizado.' }
}

/**
 * El tipo lo deciden los primeros bytes, no la extensión ni el `Content-Type`: los dos los
 * escribe quien sube el fichero. Misma regla que los comprobantes del Plan B.
 */
function sniffImage(bytes: Uint8Array): string | null {
  const empieza = (firma: readonly number[]) => firma.every((b, i) => bytes[i] === b)

  if (empieza([0x89, 0x50, 0x4e, 0x47])) return QR_MIMES[0]!
  if (empieza([0xff, 0xd8, 0xff])) return QR_MIMES[1]!
  if (empieza([0x52, 0x49, 0x46, 0x46]) && bytes.length >= 12) {
    const marca = String.fromCharCode(...bytes.slice(8, 12))
    if (marca === 'WEBP') return QR_MIMES[2]!
  }
  return null
}
