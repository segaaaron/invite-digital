'use client'

import { useState, useTransition } from 'react'
import { LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
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
  const [elegida, setElegida] = useState<Currency>(current)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-end gap-1.5">
    <label className="flex items-center gap-2.5">
      <span className={LABEL_CLASS}>Moneda</span>
      <select
        className="rounded-[var(--radius-pill)] border border-line-panel-strong bg-white px-3.5 py-2 font-mono text-[10px] tracking-[0.25em] text-ink uppercase disabled:opacity-60"
        disabled={pending}
        onChange={(e) => {
          const siguiente = e.target.value as Currency
          const anterior = elegida
          setElegida(siguiente)
          setError(null)
          start(() => {
            void setEventCurrencyAction({ eventId, eventSlug, currency: siguiente }).then((estado) => {
              // Un fallo mudo dejaría el selector en la moneda nueva y el evento en la
              // vieja: el invitado seguiría viendo la mesa de regalos en la otra.
              if (estado.status === 'error') {
                setElegida(anterior)
                setError(estado.message)
              }
            })
          })
        }}
        title="Cambia la moneda del evento. Los importes ya cargados no se convierten: se reetiquetan."
        value={elegida}
      >
        {CURRENCIES.map((moneda) => (
          <option key={moneda} value={moneda}>
            {ETIQUETA[moneda]}
          </option>
        ))}
      </select>
    </label>
      {error === null ? null : (
        <p className="max-w-[28ch] text-right text-[11px] text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
