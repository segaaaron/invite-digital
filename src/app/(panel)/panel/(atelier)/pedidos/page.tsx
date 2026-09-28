import { permanentRedirect } from 'next/navigation'
import { requireAdmin } from '@/app/_acciones/sesion'

const ETAPA: Readonly<Record<string, string>> = {
  pending_payment: 'esperando_pago',
  rejected: 'esperando_pago',
  proof_submitted: 'por_revisar',
  approved: 'cerrada',
  cancelled: 'cancelada',
}

/**
 * **Pedidos ya no es una pantalla**: un pedido es una etapa de su venta, y vive en Ventas con la
 * consulta de la que salió (28 de septiembre). Los enlaces viejos llegan al mismo filtro.
 * Los comprobantes siguen en `/panel/pedidos/comprobante/<id>`.
 */
export default async function PedidosRedirige({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireAdmin()
  const { estado } = await searchParams
  const params = new URLSearchParams({ vista: 'lista' })
  const etapa = estado === undefined ? undefined : ETAPA[estado]
  if (etapa !== undefined) params.set('etapa', etapa)
  permanentRedirect(`/panel/admin/ventas?${params.toString()}`)
}
