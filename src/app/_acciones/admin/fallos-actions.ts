'use server'

import { revalidatePath } from 'next/cache'
import { admin } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { borrarTipoDeFallo } from '@/shared/observability/lectura'

/** «Ya está arreglado»: borra ese tipo de fallo del registro. Queda en la auditoría. */
export async function borrarTipoDeFalloAction(formData: FormData): Promise<void> {
  const actor = await requireAdmin()
  const huella = String(formData.get('huella') ?? '')
  if (!/^[0-9a-f]{16}$/.test(huella)) return
  const n = await borrarTipoDeFallo(huella)
  await admin.record(actor, { action: 'fallos.borrados', subject: huella, detail: `${n} registros` })
  revalidatePath('/panel/admin/fallos')
}
