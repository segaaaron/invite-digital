'use server'

import { revalidatePath } from 'next/cache'
import { admin } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { parseSiteSettings } from '@/modules/admin/domain/site-settings'
import { fechaHora } from '@/shared/format/fecha'
import { isErr } from '@/shared/result'
import { invalidarLaWeb, texto } from '@/app/_acciones/admin/admin-comun'

// ─────────────────────────────────────────────────────────────────────────────
// «La web»: datos del negocio, pruebas sociales, legal y SEO. El formulario viaja como un
// solo JSON: son controles controlados con vista previa en vivo, y así React no vacía nada
// al terminar la acción. Lo que llega se valida entero en el dominio.
// ─────────────────────────────────────────────────────────────────────────────

export type SiteActionState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string; campo?: string; conflicto?: true }

/** La versión sobre la que se editó; vacía es «todavía no había ninguna». */
const baseDe = (formData: FormData): string | null => texto(formData, 'base') || null

/**
 * Otro admin guardó entre medias: no se escribió nada. Se dice quién y cuándo, y **no se
 * revalida**, para que lo escrito siga en el formulario hasta que se decida recargar.
 */
const conflicto = (e: { por: string; en: Date }): SiteActionState => ({
  status: 'error',
  message: `${e.por} guardó La web el ${fechaHora(e.en)}, mientras editabas. No se guardó nada tuyo: recarga para ver sus cambios y vuelve a aplicar los tuyos.`,
  conflicto: true,
})

export async function saveSiteSettingsAction(_previous: SiteActionState, formData: FormData): Promise<SiteActionState> {
  const actor = await requireAdmin()

  let datos: unknown
  try {
    datos = JSON.parse(texto(formData, 'datos'))
  } catch {
    return { status: 'error', message: 'No pudimos leer el formulario. Recarga la página.' }
  }
  // Se pasa por el lector tolerante antes de validar: lo que no tenga la forma esperada cae
  // a su valor por defecto en vez de reventar la validación.
  const guardado = await admin.saveSite(actor, parseSiteSettings(JSON.stringify(datos)), baseDe(formData))
  if (isErr(guardado)) {
    if (guardado.error.kind === 'conflict') return conflicto(guardado.error)
    if (guardado.error.kind === 'invalid_field') return { status: 'error', message: guardado.error.detail, campo: guardado.error.campo }
    console.error('saveSiteSettingsAction', guardado.error.detail)
    return { status: 'error', message: 'No pudimos guardar. Vuelve a intentarlo en un momento.' }
  }

  revalidatePath('/panel/admin/web')
  revalidatePath('/', 'layout')
  invalidarLaWeb('ajustes')
  return { status: 'success', message: 'Guardado. La web ya enseña los cambios.' }
}

export async function restoreSiteVersionAction(_previous: SiteActionState, formData: FormData): Promise<SiteActionState> {
  const actor = await requireAdmin()

  const restaurado = await admin.restoreSite(actor, texto(formData, 'versionId'), baseDe(formData))
  if (isErr(restaurado)) {
    if (restaurado.error.kind === 'conflict') return conflicto(restaurado.error)
    if (restaurado.error.kind === 'storage_failure') console.error('restoreSiteVersionAction', restaurado.error.detail)
    return { status: 'error', message: restaurado.error.kind === 'storage_failure' ? 'No pudimos restaurar. Vuelve a intentarlo.' : restaurado.error.detail }
  }

  revalidatePath('/panel/admin/web')
  revalidatePath('/', 'layout')
  invalidarLaWeb('ajustes')
  return { status: 'success', message: 'Versión restaurada. La web ya la enseña.' }
}
