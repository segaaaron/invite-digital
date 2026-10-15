'use client'

import { useId, useState, useTransition } from 'react'
import { CONTRIBUTION_METHODS, type ContributionMethod } from '../domain/fund'
import { recordContributionAction } from '@/app/_acciones/registry/actions'
import { centsOrMessage, FIELD_CLASS_DARK, LABEL_CLASS_DARK, nullIfBlank, SUBMIT_CLASS_DARK } from './shared'
import { useT } from '@/shared/i18n/idioma-navegador'
import { traducir } from '@/shared/i18n/en-ingles'
import type { T } from '@/shared/i18n/t'

const nombreDelMetodo = (t: T): Record<ContributionMethod, string> => ({
  transfer: t('Transferencia', 'Transfer'),
  card: t('Tarjeta', 'Card'),
  envelope: t('Sobre', 'Envelope'),
  other: t('Otra', 'Other'),
})

/**
 * No hay pasarela de pago: lo que llegó por transferencia o en un sobre lo registra el
 * atelier a mano. `guestGroupId` va en `null` porque quien aporta no tiene por qué ser un
 * invitado con enlace — la abuela del sobre no lo es.
 */
export function ContributionForm({ eventId, eventSlug, fundId }: { eventId: string; eventSlug: string; fundId: string }) {
  const t = useT()
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
      setError(traducir(importe.error, t))
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
          {t('De parte de', 'From')}
          <input
            className={FIELD_CLASS_DARK}
            id={nameId}
            maxLength={160}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('Abuela Rosa', 'Grandma Rose')}
            type="text"
            value={displayName}
          />
        </label>

        <label className={LABEL_CLASS_DARK} htmlFor={amountId}>
          {t('Importe', 'Amount')}
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
          {t('Forma de pago', 'Payment method')}
          <select
            className={FIELD_CLASS_DARK}
            id={methodId}
            onChange={(e) => setMethod(e.target.value as ContributionMethod)}
            value={method}
          >
            {CONTRIBUTION_METHODS.map((m) => (
              <option key={m} value={m}>
                {nombreDelMetodo(t)[m]}
              </option>
            ))}
          </select>
        </label>

        <label className={LABEL_CLASS_DARK} htmlFor={messageId}>
          {t('Mensaje', 'Message')}
          <input
            className={FIELD_CLASS_DARK}
            id={messageId}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('Opcional', 'Optional')}
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
        {pendiente ? t('Registrando…', 'Recording…') : t('Registrar', 'Record')}
      </button>
    </div>
  )
}
