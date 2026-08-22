'use client'

import { useId, useState, useTransition } from 'react'
import type { GiftRow } from '../application/ports'
import { addGiftAction, updateGiftAction } from '../actions'
import { centsOrMessage, centsToInput, FIELD_CLASS, LABEL_CLASS, nullIfBlank, SUBMIT_CLASS } from './shared'

/**
 * El mismo formulario da de alta y corrige. Con `gift` está en modo edición: llega
 * relleno y guarda contra `updateGiftAction`.
 *
 * Duplicarlo habría sido más rápido de escribir y peor de mantener: las reglas del
 * importe, el `null` del campo vacío y los mensajes de error son los mismos en los dos
 * casos, y dos copias se separan en cuanto una de las dos cambia.
 *
 * Lo que este formulario NO manda nunca es el estado ni la reserva: corregir un precio
 * mal escrito no puede soltarle el regalo a quien ya lo había apartado. El caso de uso
 * `updateGift` los conserva, y aquí sencillamente no viajan.
 */
export function GiftForm({
  eventId,
  eventSlug,
  gift,
  onDone,
}: {
  eventId: string
  eventSlug: string
  gift?: GiftRow
  onDone?: () => void
}) {
  const editando = gift !== undefined

  const [name, setName] = useState(gift?.name ?? '')
  const [price, setPrice] = useState(gift === undefined ? '' : centsToInput(gift.priceCents))
  const [store, setStore] = useState(gift?.store ?? '')
  const [url, setUrl] = useState(gift?.url ?? '')
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
    const campos = {
      eventId,
      eventSlug,
      name: name.trim(),
      priceCents: importe.cents,
      store: nullIfBlank(store),
      url: nullIfBlank(url),
    }

    empezar(async () => {
      const r = gift === undefined ? await addGiftAction(campos) : await updateGiftAction({ id: gift.id, ...campos })

      if (!r.ok) {
        setError(r.message)
        return
      }

      // Al corregir, los campos se quedan como están y la edición se cierra: vaciarlos
      // haría parpadear el formulario justo antes de desaparecer.
      if (gift !== undefined) {
        onDone?.()
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

      <div className="flex flex-wrap items-center gap-4">
        <button className={SUBMIT_CLASS} disabled={pendiente} onClick={enviar} type="button">
          {editando
            ? pendiente
              ? 'Guardando…'
              : 'Guardar cambios'
            : pendiente
              ? 'Añadiendo…'
              : 'Añadir regalo'}
        </button>

        {editando ? (
          <button
            className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute disabled:opacity-40"
            disabled={pendiente}
            onClick={() => onDone?.()}
            type="button"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </div>
  )
}
