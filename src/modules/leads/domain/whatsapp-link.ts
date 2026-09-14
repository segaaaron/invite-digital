// Pure string building over static brand data, so it lives in `domain`, not in
// `infrastructure`: the UI needs it and the boundary policy forbids ui -> infrastructure.
import { BRAND } from '@/shared/config/brand'
import type { Locale } from '@/shared/i18n/locales'

const digitsOnly = (value: string): string => value.replace(/\D/g, '')

export function buildWhatsAppLink({ message }: { message: string }): string {
  return `https://wa.me/${digitsOnly(BRAND.whatsapp)}?text=${encodeURIComponent(message)}`
}

export function whatsAppPlanMessage(plan: { name: string; price: string }, locale: Locale): string {
  return locale === 'es'
    ? `Hola, quiero la invitación del plan ${plan.name} (${plan.price}). ¿Me cuentan los siguientes pasos?`
    : `Hello, I'd like the ${plan.name} invitation plan (${plan.price}). Could you walk me through the next steps?`
}

/**
 * El enlace para escribirle **a quien consultó**, no al atelier.
 *
 * El formulario acepta el número como lo escriba cada uno: un celular boliviano sin
 * prefijo —ocho dígitos que empiezan por 6 o 7— se completa con 591, porque `wa.me` sin
 * código de país abre un chat con un número que no existe. `null` si no dejó teléfono.
 */
export function whatsAppToCustomer(phone: string | null, message: string): string | null {
  if (phone === null) return null
  const digitos = digitsOnly(phone)
  if (digitos.length === 0) return null
  const completo = /^[67]\d{7}$/.test(digitos) ? `591${digitos}` : digitos
  return `https://wa.me/${completo}?text=${encodeURIComponent(message)}`
}
