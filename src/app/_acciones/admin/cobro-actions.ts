'use server'

import { revalidatePath } from 'next/cache'
import { admin } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { isErr } from '@/shared/result'
import type { AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { QR_MIMES, refrescar, texto } from '@/app/_acciones/admin/admin-comun'

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
