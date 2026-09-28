'use server'

import { revalidatePath } from 'next/cache'
import { admin, opinionesDe } from '@/app/composition/container'
import { invalidarLaWeb } from '@/app/_acciones/admin/admin-comun'
import { requireAdmin } from '@/app/_acciones/sesion'
import { campo } from '@/shared/forms/campo'
import { isErr } from '@/shared/result'

// Las acciones de la ficha de un cliente. Del admin: empiezan por `await requireAdmin()`.

export type ClienteActionState = { status: 'idle' } | { status: 'success'; message: string } | { status: 'error'; message: string }

/** La nota y las etiquetas de un cliente. Las etiquetas llegan marcadas y, las nuevas, separadas por comas. */
export async function guardarNotaClienteAction(_previo: ClienteActionState, formData: FormData): Promise<ClienteActionState> {
  const actor = await requireAdmin()
  const marcadas = formData.getAll('etiqueta').filter((x): x is string => typeof x === 'string')
  const nuevas = campo(formData, 'otras').split(',')
  const guardada = await admin.saveClientNote(actor, {
    clave: campo(formData, 'clave'),
    nombre: campo(formData, 'nombre'),
    note: campo(formData, 'nota'),
    tags: [...marcadas, ...nuevas],
  })
  if (isErr(guardada)) {
    if (guardada.error.kind === 'storage_failure') console.error('guardarNotaClienteAction', guardada.error.detail)
    return { status: 'error', message: guardada.error.kind === 'storage_failure' ? 'No pudimos guardar la nota. Vuelve a intentarlo.' : guardada.error.detail }
  }
  revalidatePath('/panel/admin/clientes')
  return { status: 'success', message: 'Guardado.' }
}

/** El código de referido de un evento del cliente: el que ya tenía, o uno nuevo. */
export async function generarReferidoAction(formData: FormData): Promise<void> {
  await requireAdmin()
  const creado = await admin.ensureReferralCode(campo(formData, 'eventId'))
  if (isErr(creado)) console.error('generarReferidoAction', creado.error.detail)
  revalidatePath('/panel/admin/clientes')
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * La opinión de un evento, publicada como testimonio de la web de un toque. **Solo la que el
 * cliente dejó publicar**, y con el texto de la base, nunca con el que llegue del formulario.
 */
export async function publicarOpinionAction(_previo: ClienteActionState, formData: FormData): Promise<ClienteActionState> {
  const actor = await requireAdmin()
  const eventId = campo(formData, 'eventId')
  if (!UUID.test(eventId)) return { status: 'error', message: 'Ese evento no existe.' }
  const opinion = (await opinionesDe([eventId])).get(eventId)
  if (opinion === undefined || !opinion.allowPublish || opinion.comment === null || opinion.comment.trim() === '') {
    return { status: 'error', message: 'Esa opinión no tiene permiso para publicarse o no trae comentario.' }
  }
  const publicada = await admin.publishTestimonial(actor, { autor: campo(formData, 'autor'), rol: campo(formData, 'rol'), cita: opinion.comment })
  if (isErr(publicada)) {
    if (publicada.error.kind === 'storage_failure') console.error('publicarOpinionAction', publicada.error.detail)
    return {
      status: 'error',
      message:
        publicada.error.kind === 'conflict'
          ? 'Alguien estaba guardando La web justo ahora. Vuelve a intentarlo.'
          : publicada.error.kind === 'storage_failure'
            ? 'No pudimos publicarla. Vuelve a intentarlo.'
            : publicada.error.detail,
    }
  }
  revalidatePath('/panel/admin/clientes')
  revalidatePath('/panel/admin/web')
  revalidatePath('/', 'layout')
  invalidarLaWeb('ajustes')
  return { status: 'success', message: 'Publicada en la web.' }
}
