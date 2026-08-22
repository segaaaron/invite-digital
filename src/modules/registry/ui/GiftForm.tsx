'use client'

import { useId, useState, useTransition } from 'react'
import { addGiftAction } from '../actions'
import { centsOrMessage, FIELD_CLASS, LABEL_CLASS, nullIfBlank, SUBMIT_CLASS } from './shared'

export function GiftForm({ eventId, eventSlug }: { eventId: string; eventSlug: string }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [store, setStore] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const nameId = useId()
  const priceId = useId()
  const storeId = useId()
  const urlId = useId()

  const enviar = () => {
    const importe = centsOrMessage(price)
    if ('error' in importe) {
      setError(importe.error)
      return
    }

    setError(null)
    empezar(async () => {
      const r = await addGiftAction({
        eventId,
        eventSlug,
        name: name.trim(),
        priceCents: importe.cents,
        store: nullIfBlank(store),
        url: nullIfBlank(url),
      })

      if (!r.ok) {
        setError(r.message)
        return
      }

      setName('')
      setPrice('')
      setStore('')
      setUrl('')
    })
  }

  return (
    <div className="flex flex-col gap-5 rounded-[18px] border border-[var(--color-line)] p-6">
      <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
        <label className={LABEL_CLASS} htmlFor={nameId}>
          Regalo
          <input
            className={FIELD_CLASS}
            id={nameId}
            maxLength={160}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cafetera italiana"
            type="text"
            value={name}
          />
        </label>

        <label className={LABEL_CLASS} htmlFor={priceId}>
          Precio
          <input
            className={FIELD_CLASS}
            id={priceId}
            inputMode="decimal"
            onChange={(e) => setPrice(e.target.value)}
            placeholder="450,00"
            type="text"
            value={price}
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={LABEL_CLASS} htmlFor={storeId}>
          Tienda
          <input
            className={FIELD_CLASS}
            id={storeId}
            maxLength={120}
            onChange={(e) => setStore(e.target.value)}
            placeholder="Casa Ideal"
            type="text"
            value={store}
          />
        </label>

        <label className={LABEL_CLASS} htmlFor={urlId}>
          Enlace a la tienda
          <input
            className={FIELD_CLASS}
            id={urlId}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            type="url"
            value={url}
          />
        </label>
      </div>

      {error === null ? null : (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}

      <button className={SUBMIT_CLASS} disabled={pendiente} onClick={enviar} type="button">
        {pendiente ? 'Añadiendo…' : 'Añadir regalo'}
      </button>
    </div>
  )
}
