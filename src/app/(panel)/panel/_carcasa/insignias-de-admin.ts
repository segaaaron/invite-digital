import { leads, orders } from '@/app/composition/container'
import { type Actor, isAdmin } from '@/modules/identity'

/**
 * Las insignias que solo pinta la sección del admin —pedidos por revisar y consultas nuevas—.
 *
 * Las dos carcasas del panel las calculaban a su manera, y **para cualquier rol**: cada página
 * de un cliente o de la puerta leía todos los pedidos del negocio con sus comprobantes para
 * contar unos que su barra no enseña. Ahora son dos conteos, solo para el admin, en paralelo.
 * Si uno falla, la barra se pinta sin él: un contador no tumba la página.
 */
export async function insigniasDeAdmin(actor: Actor): Promise<{ pedidos: number | null; consultas: number | null }> {
  if (!isAdmin(actor)) return { pedidos: null, consultas: null }
  const [pedidos, consultas] = await Promise.allSettled([orders.porRevisar(), leads.countNew()])
  return {
    pedidos: pedidos.status === 'fulfilled' ? pedidos.value : null,
    consultas: consultas.status === 'fulfilled' ? consultas.value : null,
  }
}
