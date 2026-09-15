'use server'

import { admin } from '@/app/composition/container'
import { createCredential, parseRole } from '@/modules/identity'
import { requireAdmin } from '@/app/_acciones/sesion'
import { isErr } from '@/shared/result'
import type { AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { refrescar, texto } from '@/app/_acciones/admin/admin-comun'

/**
 * Alta de usuario.
 *
 * La contraseña inicial la escribe el admin y **se enseña una sola vez**, como los
 * enlaces de invitado: de ella solo queda su argon2.
 */
export async function createUserAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  // Lo enviado vuelve con el error —sin la contraseña—: React vacía el formulario al acabar
  // la acción, y un correo repetido obligaba a escribir otra vez correo y rol.
  const valores = { email: texto(formData, 'email'), role: texto(formData, 'role') }

  const credencial = createCredential({ email: texto(formData, 'email'), password: texto(formData, 'password') })
  if (isErr(credencial)) return { status: 'error', message: credencial.error.detail, valores }

  if (await admin.findUserByEmail(credencial.value.email)) {
    return { status: 'error', message: `Ya existe un usuario con el correo ${credencial.value.email}.`, valores }
  }

  // El plan no es de la cuenta: es de cada evento, y se elige al crear o gestionar la boda.
  const role = parseRole(texto(formData, 'role'))
  await admin.createUser({ email: credencial.value.email, password: credencial.value.password, role })
  await admin.record(actor, { action: 'usuario.alta', subject: credencial.value.email, detail: role })

  refrescar()
  return { status: 'success', message: `Usuario ${credencial.value.email} creado.` }
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
