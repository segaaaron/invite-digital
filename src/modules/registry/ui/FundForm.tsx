'use client'

import { useId, useState, useTransition } from 'react'
import { addFundAction } from '../actions'
import { centsOrMessage, FIELD_CLASS, LABEL_CLASS, nullIfBlank, SUBMIT_CLASS } from './shared'

export function FundForm({ eventId, eventSlug }: { eventId: string; eventSlug: string }) {
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const nameId = useId()
  const goalId = useId()
  const descriptionId = useId()

  const enviar = () => {
    const meta = centsOrMessage(goal)
    if ('error' in meta) {
      setError(meta.error)
      return
    }

    setError(null)
    empezar(async () => {
      const r = await addFundAction({
        eventId,
        eventSlug,
        name: name.trim(),
        description: nullIfBlank(description),
        goalCents: meta.cents,
      })

      if (!r.ok) {
        setError(r.message)
        return
      }

      setName('')
      setGoal('')
      setDescription('')
    })
  }

  return (
    <div className="flex flex-col gap-5 rounded-[18px] border border-[var(--color-line)] p-6">
      <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
        <label className={LABEL_CLASS} htmlFor={nameId}>
          Fondo
          <input
            className={FIELD_CLASS}
            id={nameId}
            maxLength={160}
            onChange={(e) => setName(e.target.value)}
            placeholder="Luna de miel"
            type="text"
            value={name}
          />
        </label>

        <label className={LABEL_CLASS} htmlFor={goalId}>
          Meta
          <input
            className={FIELD_CLASS}
            id={goalId}
            inputMode="decimal"
            onChange={(e) => setGoal(e.target.value)}
            placeholder="5.000,00"
            type="text"
            value={goal}
          />
        </label>
      </div>

      <label className={LABEL_CLASS} htmlFor={descriptionId}>
        Descripción
        <input
          className={FIELD_CLASS}
          id={descriptionId}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Para los pasajes y las noches de hotel."
          type="text"
          value={description}
        />
      </label>

      {error === null ? null : (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}

      <button className={SUBMIT_CLASS} disabled={pendiente} onClick={enviar} type="button">
        {pendiente ? 'Abriendo…' : 'Abrir fondo'}
      </button>
    </div>
  )
}
