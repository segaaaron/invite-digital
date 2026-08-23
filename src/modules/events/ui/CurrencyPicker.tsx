'use client'

import { useTransition } from 'react'
import { setEventCurrencyAction } from '../actions'
import { CURRENCIES, type Currency } from '../domain/event'

const ETIQUETA: Record<Currency, string> = { BOB: 'BOB Bs', USD: 'USD $', CAD: 'CAD $' }

/**
 * El selector de moneda que la maqueta pone en la cabecera de la mesa de regalos.
 *
 * Cambia la moneda **del evento**, que es la misma que ve el invitado en su invitación:
 * no es una preferencia de esta pantalla. Los importes ya guardados no se convierten —son
 * centavos, no una cantidad con moneda—, así que cambiarla reetiqueta lo que hay, y eso
 * se dice aquí mismo.
 */
export function CurrencyPicker({
  eventId,
  eventSlug,
  current,
}: {
  eventId: string
  eventSlug: string
  current: Currency
}) {
  const [pending, start] = useTransition()

  return (
    <label className="flex items-center gap-2.5">
      <span className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">Moneda</span>
      <select
        className="rounded-full border border-line bg-bg-top/80 px-3.5 py-2 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink uppercase disabled:opacity-60"
        disabled={pending}
        onChange={(e) => {
          const elegida = e.target.value
          start(() => {
            void setEventCurrencyAction({ eventId, eventSlug, currency: elegida })
          })
        }}
        title="Cambia la moneda del evento. Los importes ya cargados no se convierten: se reetiquetan."
        value={current}
      >
        {CURRENCIES.map((moneda) => (
          <option key={moneda} value={moneda}>
            {ETIQUETA[moneda]}
          </option>
        ))}
      </select>
    </label>
  )
}
