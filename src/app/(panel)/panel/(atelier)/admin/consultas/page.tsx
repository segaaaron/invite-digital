import { permanentRedirect } from 'next/navigation'
import { requireAdmin } from '@/app/_acciones/sesion'

const ETAPA: Readonly<Record<string, string>> = { new: 'nueva', contacted: 'contactada', won: 'cerrada', lost: 'perdida', todas: 'todas' }

/**
 * **Consultas ya no es una pantalla**: una consulta es el principio de una venta, y vive en
 * Ventas con su pedido (28 de septiembre). Los enlaces viejos —avisos, correos, marcadores—
 * llegan a la misma consulta en la lista de Ventas.
 */
export default async function ConsultasRedirige({ searchParams }: { searchParams: Promise<{ estado?: string; id?: string }> }) {
  await requireAdmin()
  const { estado, id } = await searchParams
  const params = new URLSearchParams({ vista: 'lista' })
  const etapa = estado === undefined ? undefined : ETAPA[estado]
  if (etapa !== undefined) params.set('etapa', etapa)
  if (id !== undefined) params.set('consulta', id)
  permanentRedirect(`/panel/admin/ventas?${params.toString()}`)
}
