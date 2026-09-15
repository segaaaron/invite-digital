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
  // la acción, y un correo repetido obligaba a escribir otra vez correo, rol y plan.
  const valores = { email: texto(formData, 'email'), role: texto(formData, 'role'), planSlug: texto(formData, 'planSlug') }

  const credencial = createCredential({ email: texto(formData, 'email'), password: texto(formData, 'password') })
  if (isErr(credencial)) return { status: 'error', message: credencial.error.detail, valores }

  if (await admin.findUserByEmail(credencial.value.email)) {
    return { status: 'error', message: `Ya existe un usuario con el correo ${credencial.value.email}.`, valores }
  }

  const role = parseRole(texto(formData, 'role'))
  // El plan que compró. Se valida **antes** de crear la cuenta: un plan inventado no puede
  // dejar un usuario a medias.
  const planSlug = texto(formData, 'planSlug')
  if (planSlug !== '' && !(await admin.planSlugs()).includes(planSlug)) {
    return { status: 'error', message: `No existe el plan ${planSlug}.`, valores }
  }

  const creado = await admin.createUser({ email: credencial.value.email, password: credencial.value.password, role })

  // Son dos escrituras. Si la del plan falla, la cuenta ya existe y no se deshace: se dice,
  // en vez de reventar la pantalla y dejar al admin creyendo que no se creó nada.
  let avisoDePlan = planSlug === '' ? ', sin plan' : ` con el plan ${planSlug}`
  if (planSlug !== '') {
    try {
      await admin.setUserPlan(creado.id, planSlug)
    } catch (causa) {
      console.error('alta de usuario sin plan', causa)
      avisoDePlan = `, pero sin plan: no se pudo asignar ${planSlug}; asígnalo en su fila`
    }
  }

  await admin.record(actor, {
    action: 'usuario.alta',
    subject: credencial.value.email,
    detail: planSlug === '' ? role : `${role} · plan ${planSlug}`,
  })

  refrescar()
  return { status: 'success', message: `Usuario ${credencial.value.email} creado como ${role}${avisoDePlan}.` }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Cambia el plan que compró un usuario. Vacío se lo quita. */
export async function setUserPlanAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const userId = texto(formData, 'userId')
  const planSlug = texto(formData, 'planSlug')
  // Un id que no es UUID lo rechazaría Postgres con un error de sintaxis, y la acción
  // reventaría con la pantalla de error en vez de decir que ese usuario no existe.
  if (!UUID.test(userId)) return { status: 'error', message: 'Ese usuario no existe.' }
  if (planSlug !== '' && !(await admin.planSlugs()).includes(planSlug)) {
    return { status: 'error', message: `No existe el plan ${planSlug}.` }
  }

  let existia: boolean
  try {
    existia = await admin.setUserPlan(userId, planSlug === '' ? null : planSlug)
  } catch (causa) {
    console.error('setUserPlanAction', causa)
    return { status: 'error', message: 'No pudimos guardar el plan. Vuelve a intentarlo en un momento.' }
  }
  // Sin esto, el plan de un usuario ya borrado decía «cambiado» y quedaba en la auditoría.
  if (!existia) return { status: 'error', message: 'Ese usuario ya no existe.' }

  await admin.record(actor, {
    action: 'usuario.plan',
    subject: texto(formData, 'email') || userId,
    detail: planSlug === '' ? 'sin plan' : planSlug,
  })

  refrescar()
  return { status: 'success', message: planSlug === '' ? 'Plan quitado.' : `Plan cambiado a ${planSlug}.` }
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
