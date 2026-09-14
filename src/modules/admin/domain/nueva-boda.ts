/**
 * El `slug` de una boda creada desde la administración.
 *
 * **No sale de una referencia de pedido, porque aquí no hay pedido.** Cuando el admin crea
 * la boda para un cliente que llegó por WhatsApp, lo único que hay es el título; y el
 * título choca: dos bodas «Familia García» darían `duplicate_slug`, y lo darían **después**
 * de haber comprobado el acceso y justo antes de crear la cuenta. Por eso lleva un sufijo.
 *
 * El alfabeto del sufijo no tiene `0`, `O`, `1`, `I` ni `L`: estos `slug` acaban dictándose
 * por teléfono y apareciendo en el enlace que se reparte, igual que las referencias de
 * pedido.
 *
 * Módulo puro: ni reloj ni azar. El sufijo entra como argumento para que la regla se pruebe
 * entera y quien la usa solo traiga el ruido.
 */

/** Sin `0`, `O`, `1`, `I` ni `L`: se dictan por teléfono. */
export const ALFABETO_SUFIJO = 'abcdefghjkmnpqrstuvwxyz23456789'

/** Lo que el dominio del evento admite: minúsculas, números y guiones, hasta 64. */
const LARGO_MAXIMO = 64

/**
 * Pasa un título a la forma que exige el `slug`: minúsculas, sin tildes, con guiones.
 *
 * Las tildes se descomponen y se tiran sus marcas —«Quinceañera» acaba en `quinceanera`—
 * porque el dominio del evento solo admite `a-z0-9-`, y una `ñ` cruda dejaría el alta
 * rechazada con un mensaje que no dice qué carácter sobra.
 */
export function aSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * El `slug` final: el título convertido más el sufijo.
 *
 * Si el título no deja ni una letra utilizable —solo signos, o un alfabeto que no es
 * latino— queda `boda-<sufijo>`. Un `slug` vacío no es admisible y fallar por eso sería
 * rechazar un alta por cómo se llama la boda.
 */
export function slugDeBoda(titulo: string, sufijo: string): string {
  const base = aSlug(titulo) || 'boda'
  const cola = aSlug(sufijo)
  const recortada = base.slice(0, LARGO_MAXIMO - cola.length - 1).replace(/-+$/, '')
  return cola === '' ? recortada : `${recortada}-${cola}`
}
