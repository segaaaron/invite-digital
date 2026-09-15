'use client'

import { useId, useState, useTransition } from 'react'
import { CONTRIBUTION_METHODS, type ContributionMethod } from '../domain/fund'
import { recordContributionAction } from '@/app/_acciones/registry/actions'
import { centsOrMessage, FIELD_CLASS_DARK, LABEL_CLASS_DARK, nullIfBlank, SUBMIT_CLASS_DARK } from './shared'

const NOMBRE_DEL_METODO: Record<ContributionMethod, string> = {
  transfer: 'Transferencia',
  card: 'Tarjeta',
  envelope: 'Sobre',
  other: 'Otra',
}

/**
 * No hay pasarela de pago: lo que llegó por transferencia o en un sobre lo registra el
 * atelier a mano. `guestGroupId` va en `null` porque quien aporta no tiene por qué ser un
 * invitado con enlace — la abuela del sobre no lo es.
 */
export function ContributionForm({ eventId, eventSlug, fundId }: { eventId: string; eventSlug: string; fundId: string }) {
  const [displayName, setDisplayName] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<ContributionMethod>('transfer')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const nameId = useId()
  const amountId = useId()
  const methodId = useId()
  const messageId = useId()

  const enviar = () => {
    const importe = centsOrMessage(amount)
    if ('error' in importe) {
      setError(importe.error)
      return
    }

    setError(null)
    empezar(async () => {
      const r = await recordContributionAction({
        eventId,
        eventSlug,
        fundId,
        guestGroupId: null,
        displayName: displayName.trim(),
        amountCents: importe.cents,
        method,
        message: nullIfBlank(message),
      })

      if (!r.ok) {
        setError(r.message)
        return
      }

      setDisplayName('')
      setAmount('')
      setMessage('')
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={LABEL_CLASS_DARK} htmlFor={nameId}>
          De parte de
          <input
            className={FIELD_CLASS_DARK}
            id={nameId}
            maxLength={160}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Abuela Rosa"
            type="text"
            value={displayName}
          />
        </label>

        <label className={LABEL_CLASS_DARK} htmlFor={amountId}>
          Importe
          <input
            className={FIELD_CLASS_DARK}
            id={amountId}
            inputMode="decimal"
            onChange={(e) => setAmount(e.target.value)}
            placeholder="150,00"
            type="text"
            value={amount}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={LABEL_CLASS_DARK} htmlFor={methodId}>
          Forma de pago
          <select
            className={FIELD_CLASS_DARK}
            id={methodId}
            onChange={(e) => setMethod(e.target.value as ContributionMethod)}
            value={method}
          >
            {CONTRIBUTION_METHODS.map((m) => (
              <option key={m} value={m}>
                {NOMBRE_DEL_METODO[m]}
              </option>
            ))}
          </select>
        </label>

        <label className={LABEL_CLASS_DARK} htmlFor={messageId}>
          Mensaje
          <input
            className={FIELD_CLASS_DARK}
            id={messageId}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Opcional"
            type="text"
            value={message}
          />
        </label>
      </div>

      {error === null ? null : (
        <p className="text-[13px] text-[var(--color-gold-light)]" role="alert">
          {error}
        </p>
      )}

      <button className={SUBMIT_CLASS_DARK} disabled={pendiente} onClick={enviar} type="button" aria-busy={(pendiente) || undefined}>
        {pendiente ? 'Registrando…' : 'Registrar'}
      </button>
    </div>
  )
}
