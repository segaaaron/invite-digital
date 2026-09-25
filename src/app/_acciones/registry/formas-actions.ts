'use server'

import { revalidatePath } from 'next/cache'
import { registry } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { MAX_QR_BYTES } from '@/modules/registry/application/formas-use-cases'
import { isErr } from '@/shared/result'

export type FormasState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string; valores?: Record<string, string> }

const texto = (formData: FormData, campo: string): string => String(formData.get(campo) ?? '')

/**
 * Guarda la lluvia de sobres y la transferencia con su QR. **En todos los planes** (pedido del
 * usuario, 24 de septiembre): es la forma de regalar que más se usa en Bolivia. La abre la
 * sección del anfitrión: el cliente la escribe, como su invitación.
 */
export async function guardarFormasDeRegalarAction(_previo: FormasState, formData: FormData): Promise<FormasState> {
  const actor = await requireSession()
  const eventId = await requireEventAccess(actor, { eventId: texto(formData, 'eventId'), eventSlug: texto(formData, 'eventSlug'), section: 'cliente' })

  // React vacía el formulario al terminar, también con error: vuelven los textos (nunca el fichero).
  const valores = Object.fromEntries(['sobresTexto', 'banco', 'titular', 'cuenta', 'nota'].map((c) => [c, texto(formData, c)]))
  valores.sobres = formData.get('sobres') === 'on' ? 'on' : ''
  valores.transferencia = formData.get('transferencia') === 'on' ? 'on' : ''

  const fichero = formData.get('qr')
  let qr: { bytes: Uint8Array } | 'quitar' | 'mantener' = formData.get('quitarQr') === '1' ? 'quitar' : 'mantener'
  if (fichero instanceof File && fichero.size > 0) {
    // El tope antes de leerlo a memoria.
    if (fichero.size > MAX_QR_BYTES) return { status: 'error', message: 'La imagen del QR pesa más de 2 MB.', valores }
    qr = { bytes: new Uint8Array(await fichero.arrayBuffer()) }
  }

  const guardado = await registry.guardarFormas({
    eventId,
    entrada: {
      sobres: formData.get('sobres') === 'on',
      sobresTexto: texto(formData, 'sobresTexto'),
      transferencia: formData.get('transferencia') === 'on',
      banco: texto(formData, 'banco'),
      titular: texto(formData, 'titular'),
      cuenta: texto(formData, 'cuenta'),
      nota: texto(formData, 'nota'),
    },
    qr,
  })
  if (isErr(guardado)) {
    if (guardado.error.kind === 'storage_failure') console.error('formas de regalar:', guardado.error.detail)
    return {
      status: 'error',
      message: guardado.error.kind === 'storage_failure' ? 'No pudimos guardar. Vuelve a intentarlo en un momento.' : guardado.error.detail,
      valores,
    }
  }

  revalidatePath(`/panel/eventos/${texto(formData, 'eventSlug')}/regalos`)
  return { status: 'success', message: 'Guardado. Ya lo ven tus invitados en la invitación.' }
}
