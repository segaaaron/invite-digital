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
