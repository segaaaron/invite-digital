import { redirect } from 'next/navigation'
import { requireSession } from '@/app/_acciones/sesion'
import { isAdmin } from '@/modules/identity'
import { primerEventoConLuxury } from '../_carcasa/asistente'

export const dynamic = 'force-dynamic'

/**
 * **«Hablar con Luxury»** desde el icono del panel instalado (acceso del manifiesto, Android): lleva al evento
 * que viene y tiene a Luxury —en el orden de «Mis eventos»— con Luxury abierto y escuchando (`?luxury=voz`).
 * Sin Luxury en ninguno (o la recepción, que no lo usa), a su panel de siempre.
 */
export default async function HablarConLuxury() {
  const actor = await requireSession()
  if (isAdmin(actor)) redirect('/panel/admin')
  const acceso = await primerEventoConLuxury(actor)
  redirect(acceso === null ? '/panel' : `/panel/eventos/${acceso.evento.slug}?luxury=voz`)
}
