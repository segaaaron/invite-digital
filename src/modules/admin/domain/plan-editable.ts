import { err, ok, type Result } from '@/shared/result'
import { adminError, type AdminError } from './errors'

/**
 * Lo que el admin cambia de un plan sin desplegar: precio, tope, funciones y textos.
 *
 * El importe llega **ya en centavos**: lo parsea la acción con `parseAmount` de la mesa de
 * regalos, que es el único sitio del proyecto donde se convierte texto en dinero, y el
 * dominio no puede importar otro módulo.
 */
export type TextoPlan = { name: string; tagline: string; description: string; features: string }

export type PlanCrudo = {
  priceCents: number
  maxGuestGroups: string
  /** Cuántos porteros puede sumar quien compró. Texto del formulario; cero es sin puerta. */
  maxDoorPorters: string
  includesSeating: boolean
  includesRegistry: boolean
  includesCheckin: boolean
  highlighted: boolean
  isActive: boolean
  es: TextoPlan
  en: TextoPlan
}

export type TextoPlanLimpio = { name: string; tagline: string; description: string; features: string[] }

export type PlanLimpio = Omit<PlanCrudo, 'maxGuestGroups' | 'maxDoorPorters' | 'es' | 'en'> & {
  maxGuestGroups: number | null
  maxDoorPorters: number
  es: TextoPlanLimpio
  en: TextoPlanLimpio
}

/** Lo que cabe en la tarjeta de precios sin partirla. */
export const MAX_FUNCIONES = 12

const IDIOMA = { es: 'español', en: 'inglés' } as const

function leerTexto(texto: TextoPlan, idioma: keyof typeof IDIOMA): Result<TextoPlanLimpio, AdminError> {
  const nombre = texto.name.trim()
  const lema = texto.tagline.trim()
  const descripcion = texto.description.trim()
  const funciones = texto.features
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0)

  const en = IDIOMA[idioma]
  if (nombre.length === 0 || nombre.length > 120) return err(adminError('invalid_input', `El nombre en ${en} es obligatorio (hasta 120).`))
  if (lema.length > 200) return err(adminError('invalid_input', `El lema en ${en} pasa de 200 caracteres.`))
  // Sin funciones, `createPlan` del catálogo rechaza el plan y la página de precios entera
  // devuelve error: no es un plan feo, es una web sin precios.
  if (funciones.length === 0) return err(adminError('invalid_input', `Escribe al menos una función en ${en}, una por línea.`))
  if (funciones.length > MAX_FUNCIONES) return err(adminError('invalid_input', `Hasta ${MAX_FUNCIONES} funciones en ${en}.`))

  return ok({ name: nombre, tagline: lema, description: descripcion, features: funciones })
}

export function leerPlan(crudo: PlanCrudo): Result<PlanLimpio, AdminError> {
  if (!Number.isInteger(crudo.priceCents) || crudo.priceCents <= 0) {
    return err(adminError('invalid_input', 'El precio tiene que ser mayor que cero.'))
  }

  const tope = crudo.maxGuestGroups.trim()
  let maxGuestGroups: number | null = null
  if (tope !== '') {
    // Vacío es *sin límite*. Un cero dejaría al plan sin admitir ni un grupo.
    if (!/^\d+$/.test(tope) || Number(tope) < 1 || Number(tope) > 100_000) {
      return err(adminError('invalid_input', 'El tope de grupos es un número entero mayor que cero, o vacío para sin límite.'))
    }
    maxGuestGroups = Number(tope)
  }

  // Porteros siempre con número: la puerta no se vende sin tope, y cero es un plan sin ella.
  const porteros = crudo.maxDoorPorters.trim()
  if (!/^\d+$/.test(porteros) || Number(porteros) > 100) {
    return err(adminError('invalid_input', 'Los porteros son un número entero de 0 a 100.'))
  }

  const es = leerTexto(crudo.es, 'es')
  if (!es.ok) return es
  const en = leerTexto(crudo.en, 'en')
  if (!en.ok) return en

  return ok({ ...crudo, maxGuestGroups, maxDoorPorters: Number(porteros), es: es.value, en: en.value })
}
