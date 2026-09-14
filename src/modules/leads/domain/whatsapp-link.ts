import { enlaceWhatsapp } from '@/shared/whatsapp'

/**
 * El enlace para escribirle **al atelier**. El número ya no vive en el código: lo edita el
 * admin en «La web» y llega por props. `null` sin número configurado, y quien llama remite
 * entonces al formulario de contacto en vez de pintar un enlace a ninguna parte.
 */
export function buildWhatsAppLink(numero: string, message: string): string | null {
  return whatsAppToCustomer(numero === '' ? null : numero, message)
}

/** La plantilla del mensaje de un plan, con `{plan}` y `{precio}` sustituidos. */
export const fillPlanMessage = (plantilla: string, plan: { name: string; price: string }): string =>
  plantilla.replaceAll('{plan}', plan.name).replaceAll('{precio}', plan.price)

/**
 * El enlace para escribirle **a quien consultó**, no al atelier. Mismo cálculo que el del
 * atelier —un celular boliviano sin prefijo se completa con 591—, que vive en
 * `shared/whatsapp`. `null` si no dejó teléfono.
 */
export function whatsAppToCustomer(phone: string | null, message: string): string | null {
  return enlaceWhatsapp(phone, message)
}
