import type { ReactNode } from 'react'
import type { Locale } from '@/shared/i18n/locales'
import { formatMoney } from '../domain/money'

/** Un importe en bolivianos, que es lo que se cobra (7 nov: la web ya no enseña dólares). */
export function Monto({ cents, locale }: { cents: number; locale: Locale }) {
  return <>{formatMoney({ cents, currency: 'BOB' }, locale)}</>
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
