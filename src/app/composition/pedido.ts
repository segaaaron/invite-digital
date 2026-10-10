import { tieneLuxury } from '@/modules/asistente'
import { capacidadDePlan, extraDisponible } from '@/modules/plans'
import { asistente } from './asistente'
import { plans } from './negocio'

/**
 * **Los adicionales que se pueden pedir con un plan** (9 oct, pedido completo): la misma regla que el panel
 * (`extraDisponible`) —no se vende «+40 invitaciones» a un plan sin tope ni Luxury a quien ya lo trae— y
 * Luxury solo si existe (clave de OpenAI). La usan la página del pedido, para ofrecerlos, y la acción, para
 * no cobrar lo que no corresponde aunque llegue por POST. Lee **al día**, sin la caché de la web: decide
 * sobre dinero.
 */
export async function extrasParaPedido(planSlug: string) {
  const [filas, extras] = await Promise.all([plans.listActive(), plans.listActiveExtras()])
  const fila = filas.find((f) => f.slug === planSlug)
  if (fila === undefined) return []
  const config = asistente.disponible ? await asistente.config().catch(() => null) : null
  const base = capacidadDePlan(fila)
  const capacidad = { ...base, asistente: config === null ? true : tieneLuxury(base, config) }
  const encargo = fila.correctionRounds != null && fila.deliveryDays != null
  // Sin Luxury configurado, la capacidad lo da por «incluido» y no se ofrece.
  return extras.filter((x) => extraDisponible(capacidad, x.effect, { encargo }).ok)
}
