import type { ReactNode } from 'react'
import type { Locale } from '@/shared/i18n/locales'
import { enDolares, formatMoney } from '../domain/money'

/**
 * Un importe con sus dos caras: en bolivianos, y en dólares cuando el selector de moneda está en USD
 * (`group/precios`, como el precio de las tarjetas). Sin selector en la página, se ve solo en Bs.
 */
export function Monto({ cents, locale, usd }: { cents: number; locale: Locale; usd?: string }) {
  return (
    <>
      <span className="group-data-[moneda=usd]/precios:hidden">{formatMoney({ cents, currency: 'BOB' }, locale)}</span>
      <span className="hidden group-data-[moneda=usd]/precios:inline">{usd ?? enDolares(cents)}</span>
    </>
  )
}

/** «Reserva con {monto} · …» con el importe como nodo: la frase sigue en el diccionario. */
export function conMonto(texto: string, monto: ReactNode): ReactNode {
  const [antes = '', despues = ''] = texto.split('{monto}')
  return (
    <>
      {antes}
      {monto}
      {despues}
    </>
  )
}
