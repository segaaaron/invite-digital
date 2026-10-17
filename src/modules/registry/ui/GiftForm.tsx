'use client'

import { useRouter } from 'next/navigation'

import { useId, useState, useTransition } from 'react'
import type { GiftRow } from '../application/ports'
import { addGiftAction, updateGiftAction } from '@/app/_acciones/registry/actions'
import { centsOrMessage, centsToInput, FIELD_CLASS, LABEL_CLASS, nullIfBlank, SUBMIT_CLASS } from './shared'
import { useT } from '@/shared/i18n/idioma-navegador'
import { traducir } from '@/shared/i18n/en-ingles'

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
  doneHref,
}: {
  eventId: string
  eventSlug: string
  gift?: GiftRow
  onDone?: () => void
  /** Adónde volver tras crear. Es lo que cierra el diálogo del alta. */
  doneHref?: string | undefined
}) {
  const t = useT()
  const editando = gift !== undefined

  const [name, setName] = useState(gift?.name ?? '')
  const [price, setPrice] = useState(gift === undefined ? '' : centsToInput(gift.priceCents))
  const [store, setStore] = useState(gift?.store ?? '')
  const [url, setUrl] = useState(gift?.url ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()
  const router = useRouter()

  const nameId = useId()
  const priceId = useId()
  const storeId = useId()
  const urlId = useId()

  const enviar = () => {
    const importe = centsOrMessage(price)
    if ('error' in importe) {
      setError(traducir(importe.error, t))
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

      // Crear desde el diálogo lo cierra volviendo a la lista, como en la maqueta.
      if (doneHref !== undefined) {
        router.replace(doneHref)
        return
      }

      setName('')
      setPrice('')
      setStore('')
      setUrl('')
    })
  }

  return (
    <div className={`flex flex-col gap-5 ${doneHref === undefined ? 'rounded-[18px] border border-line-panel p-6' : ''}`}>
      <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
        <label className={LABEL_CLASS} htmlFor={nameId}>
          {t('Regalo', 'Gift')}
          <input
            className={FIELD_CLASS}
            id={nameId}
            maxLength={160}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('Cafetera italiana', 'Espresso maker')}
            type="text"
            value={name}
          />
        </label>

        <label className={LABEL_CLASS} htmlFor={priceId}>
          {t('Precio', 'Price')}
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
          {t('Tienda', 'Store')}
          <input
            className={FIELD_CLASS}
            id={storeId}
            maxLength={120}
            onChange={(e) => setStore(e.target.value)}
            placeholder={t('Casa Ideal', 'Home Store')}
            type="text"
            value={store}
          />
        </label>

        <label className={LABEL_CLASS} htmlFor={urlId}>
          {t('Enlace a la tienda', 'Store link')}
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
              ? t('Guardando…', 'Saving…')
              : t('Guardar cambios', 'Save changes')
            : pendiente
              ? t('Añadiendo…', 'Adding…')
              : t('Añadir regalo', 'Add gift')}
        </button>

        {editando ? (
          <button
            className="font-mono text-[12px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute disabled:opacity-40"
            disabled={pendiente}
            onClick={() => onDone?.()}
            type="button"
          >
            {t('Cancelar', 'Cancel')}
          </button>
        ) : null}
      </div>
    </div>
  )
}
