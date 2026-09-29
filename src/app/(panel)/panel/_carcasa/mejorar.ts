import { events, plans } from '@/app/composition/container'
import type { Actor } from '@/modules/identity'
import type { Mejorar } from '@/modules/plans'
import { isOk } from '@/shared/result'

/**
 * Adónde lleva «mejorar el plan» a quien mira: el atelier y el admin cambian el plan, el
 * anfitrión compra extras (si hay alguno a la venta), y el resto de su equipo no compra (`null`). Se pregunta a las
 * mismas guardias que abren esas páginas: un enlace que no las pase sería un 404 en blanco.
 */
export async function mejorarPara(actor: Actor, slug: string, textoExtras = 'Ver extras'): Promise<Mejorar> {
  const base = `/panel/eventos/${slug}`
  if (isOk(await events.getFor(actor, slug, { section: 'ficha' }))) return { href: `${base}/plan`, label: 'Ver planes' }
  // Al anfitrión solo se le manda a Extras si hay algo a la venta: con todo apagado, Extras es una página vacía.
  if (isOk(await events.getFor(actor, slug, { section: 'equipo' })) && (await plans.listActiveExtras()).length > 0) return { href: `${base}/extras`, label: textoExtras }
  return null
}
