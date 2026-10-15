'use server'

import { randomBytes } from 'node:crypto'
import { admin, notifications } from '@/app/composition/container'
import { createCredential, parseRole } from '@/modules/identity'
import { requireAdmin } from '@/app/_acciones/sesion'
import { isErr } from '@/shared/result'
import type { AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { refrescar, texto } from '@/app/_acciones/admin/admin-comun'
import { registrarFallo } from '@/shared/observability/fallos'
import { tr } from '@/shared/i18n/idioma-servidor'
import { traducir } from '@/shared/i18n/en-ingles'

/**
 * Alta de usuario.
 *
 * La contraseña inicial la escribe el admin y **se enseña una sola vez**, como los
 * enlaces de invitado: de ella solo queda su argon2. Se le manda por correo con el enlace
 * —es provisional: la cuenta nace obligada a cambiarla—, y si el correo no sale, la
 * pantalla lo dice para que el admin se la pase por otra vía.
 */
export async function createUserAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const t = await tr()
  const actor = await requireAdmin()

  // Lo enviado vuelve con el error —sin la contraseña—: React vacía el formulario al acabar
  // la acción, y un correo repetido obligaba a escribir otra vez correo y rol.
  const valores = { email: texto(formData, 'email'), role: texto(formData, 'role') }

  // La contraseña provisional **se genera**: nadie la inventa ni la escribe. Le llega por correo y la
  // cambia al entrar; si el correo no sale, se enseña aquí una vez.
  const credencial = createCredential({ email: texto(formData, 'email'), password: randomBytes(12).toString('base64url') })
  if (isErr(credencial)) return { status: 'error', message: traducir(credencial.error.detail, t), valores }

  if (await admin.findUserByEmail(credencial.value.email)) {
    return { status: 'error', message: t(`Ya existe un usuario con el correo ${credencial.value.email}.`, `A user with the email ${credencial.value.email} already exists.`), valores }
  }

  // El plan no es de la cuenta: es de cada evento, y se elige al crear o gestionar la boda. Los
  // clientes no se dan de alta aquí: nacen con su evento (Eventos › Nuevo evento).
  const role = parseRole(texto(formData, 'role'))
  if (role === 'cliente') return { status: 'error', message: t('Los clientes reciben su cuenta al crear su evento.', 'Clients get their account when their event is created.'), valores }
  await admin.createUser({ email: credencial.value.email, password: credencial.value.password, role })
  await admin.record(actor, { action: 'usuario.alta', subject: credencial.value.email, detail: role })

  const enviado = await notifications.sendTeamAccess({ to: credencial.value.email, password: credencial.value.password, rol: role })

  refrescar()
  return {
    status: 'success',
    message: enviado
      ? t(`Usuario ${credencial.value.email} creado. Le enviamos su acceso por correo.`, `User ${credencial.value.email} created. We emailed them their access.`)
      : t(`Usuario ${credencial.value.email} creado, pero el correo no salió. Pásale esta contraseña provisional, que no se vuelve a mostrar: ${credencial.value.password}`, `User ${credencial.value.email} created, but the email didn’t go out. Give them this temporary password, which won’t be shown again: ${credencial.value.password}`),
  }
}

export async function setUserRoleAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const t = await tr()
  const actor = await requireAdmin()

  const result = await admin.setRole(actor, { userId: texto(formData, 'userId'), role: parseRole(texto(formData, 'role')) })
  if (isErr(result)) {
    registrarFallo('admin/usuarios-actions', 'cambio de rol rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: traducir(result.error.detail, t) }
  }

  refrescar()
  return { status: 'success' }
}

export async function deleteUserAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const t = await tr()
  const actor = await requireAdmin()

  const result = await admin.deleteUser(actor, texto(formData, 'userId'))
  if (isErr(result)) {
    registrarFallo('admin/usuarios-actions', 'borrado de usuario rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: traducir(result.error.detail, t) }
  }

  refrescar()
  return { status: 'success' }
}
