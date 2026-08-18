import { err, ok, type Result } from '@/shared/result'
import type { Locale } from '@/shared/i18n/locales'
import { catalogError, type CatalogError } from './errors'

export type Currency = 'BOB'

export type Money = { readonly cents: number; readonly currency: Currency }

const CENTS_PER_UNIT = 100

export function createMoney(cents: number, currency: Currency = 'BOB'): Result<Money, CatalogError> {
  if (!Number.isInteger(cents)) {
    return err(catalogError('invalid_price', `El precio debe ser un entero en centavos, recibido ${cents}`))
  }
  if (cents <= 0) {
    return err(catalogError('invalid_price', `El precio debe ser mayor a cero, recibido ${cents}`))
  }
  return ok({ cents, currency })
}

const GROUPING_LOCALE: Record<Locale, string> = { es: 'es-BO', en: 'en-US' }

export function formatMoney(money: Money, locale: Locale): string {
  const units = money.cents / CENTS_PER_UNIT
  const isRound = units % 1 === 0
  const amount = new Intl.NumberFormat(GROUPING_LOCALE[locale], {
    minimumFractionDigits: isRound ? 0 : 2,
    maximumFractionDigits: isRound ? 0 : 2,
  }).format(units)
  return `Bs ${amount}`
}
