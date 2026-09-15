'use server'

import { revalidatePath } from 'next/cache'
import { admin } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { MAX_AUDIO_UPLOAD_BYTES } from '@/shared/audio/audio'
import { isErr } from '@/shared/result'
import type { AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { invalidarLaWeb, refrescar, texto } from '@/app/_acciones/admin/admin-comun'

// ─────────────────────────────────────────────────────────────────────────────
// La música de los modelos del escaparate.
//
// Es la web pública: los dieciséis que cualquiera mira antes de comprar. Lo que suena en
// una invitación de verdad es otra cosa, vive en `event_media` y lo sube el atelier o su
// cliente desde Configuración de esa boda.
// ─────────────────────────────────────────────────────────────────────────────

/** Sube el MP3 de un modelo. */
export async function uploadShowcaseMusicAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const themeKey = texto(formData, 'themeKey')
  const archivo = formData.get('musica')
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { status: 'error', message: 'Elige una canción antes de subirla.' }
  }
  // El tope, antes de leer el fichero a memoria: un `arrayBuffer()` de un archivo enorme
  // se lo trae entero al servidor antes de que nadie lo rechace.
  if (archivo.size > MAX_AUDIO_UPLOAD_BYTES) {
    return { status: 'error', message: 'La canción pasa de 30 MB.' }
  }

  const bytes = new Uint8Array(await archivo.arrayBuffer())
  const result = await admin.saveShowcaseMusic(actor, {
    themeKey,
    bytes,
    nombreArchivo: archivo.name,
    nombre: { track: texto(formData, 'track'), artist: texto(formData, 'artist') },
  })
  if (isErr(result)) {
    console.error('música del escaparate rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  refrescar()
  revalidatePath('/panel/admin/modelos')
  // Sin esto el modelo seguiría mudo hasta que caducara la caché de su página.
  revalidatePath('/modelos', 'layout')
  invalidarLaWeb('modelos')
  return { status: 'success', message: 'Ese modelo ya suena en la web.' }
}

/** Cambia el nombre que dice el reproductor de un modelo, sin volver a subir la canción. */
export async function renameShowcaseSongAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const result = await admin.renameShowcaseSong(actor, texto(formData, 'themeKey'), {
    track: texto(formData, 'track'),
    artist: texto(formData, 'artist'),
  })
  if (isErr(result)) {
    if (result.error.kind === 'storage_failure') console.error('nombre de canción', result.error.detail)
    return { status: 'error', message: result.error.kind === 'storage_failure' ? 'No pudimos guardar el nombre.' : result.error.detail }
  }

  revalidatePath('/panel/admin/modelos')
  revalidatePath('/modelos', 'layout')
  invalidarLaWeb('modelos')
  return { status: 'success', message: 'Nombre guardado. El reproductor del modelo ya lo dice.' }
}

/** Deja mudo un modelo: vuelve a como nació. */
export async function removeShowcaseMusicAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const result = await admin.removeShowcaseMusic(actor, texto(formData, 'themeKey'))
  if (isErr(result)) {
    console.error('no se pudo quitar la música', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  refrescar()
  revalidatePath('/panel/admin/modelos')
  revalidatePath('/modelos', 'layout')
  invalidarLaWeb('modelos')
  return { status: 'success', message: 'Ese modelo se quedó sin música.' }
}

/** Publica o retira un modelo del escaparate. Retirar no borra: los enlaces siguen vivos. */
export async function setTemplatePublishedAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const publicar = texto(formData, 'publicar') === 'si'
  const hecho = await admin.setPublished(actor, texto(formData, 'themeKey'), publicar)
  if (isErr(hecho)) {
    if (hecho.error.kind === 'storage_failure') console.error('setTemplatePublishedAction', hecho.error.detail)
    return { status: 'error', message: hecho.error.kind === 'storage_failure' ? 'No pudimos cambiarlo. Vuelve a intentarlo.' : hecho.error.detail }
  }

  revalidatePath('/panel/admin/modelos')
  invalidarLaWeb('catalogo')
  return { status: 'success', message: publicar ? 'Publicado en la web.' : 'Retirado de la web.' }
}
