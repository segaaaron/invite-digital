'use client'

import { useState, useTransition } from 'react'
import { formatAmount } from '../domain/money'
import type { GiftStatus } from '../domain/gift'
import type { GiftRow } from '../application/ports'
import { markPurchasedAction, releaseGiftAsAtelierAction, removeGiftAction } from '../actions'
import { PILL_CLASS } from './shared'

type Props = {
  eventId: string
  eventSlug: string
  currency: string
  gifts: readonly GiftRow[]
}

/**
 * El estado se lee del color del borde y de la etiqueta: gris disponible, ámbar
 * reservado, verde comprado. Son `--color-line`, `--color-warn` y `--color-ok` de
 * `tokens.css`; aquí no hay ni un hexadecimal.
 */
const ESTADO: Record<GiftStatus, { clase: string; texto: string }> = {
  available: { clase: 'border-line text-ink-mute', texto: 'Disponible' },
  reserved: { clase: 'border-warn text-warn', texto: 'Reservado' },
  purchased: { clase: 'border-ok text-ok', texto: 'Comprado' },
}

function GiftCard({ eventId, eventSlug, currency, gift }: Omit<Props, 'gifts'> & { gift: GiftRow }) {
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const correr = (accion: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null)
    setAviso(null)
    empezar(async () => {
      const r = await accion()
      if (r.ok) setAviso(r.message ?? null)
      else setError(r.message ?? 'No se pudo completar la operación.')
    })
  }

  const { clase, texto } = ESTADO[gift.status]
  // Comprado es definitivo: la tarjeta no ofrece ninguna salida de ese estado, igual que
  // el dominio no la permite. Un botón deshabilitado invitaría a intentarlo.
  const definitivo = gift.status === 'purchased'

  return (
    <article className={`flex flex-col gap-3 rounded-card border bg-bg-raised p-5 ${clase}`}>
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[18px] font-light text-ink">{gift.name}</h3>
        <span className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)]">{texto}</span>
      </header>

      <p className="font-mono text-[13px] text-ink">{formatAmount(gift.priceCents, currency)}</p>

      {gift.url === null ? (
        gift.store === null ? null : <p className="text-[12px] text-ink-mute">{gift.store}</p>
      ) : (
        <a
          className="text-[12px] text-gold-deep underline underline-offset-4"
          href={gift.url}
          // `noopener noreferrer` y pestaña nueva: el destino es una tienda cualquiera y
          // no tiene por qué recibir de dónde viene el invitado ni tocar esta ventana.
          rel="noopener noreferrer"
          target="_blank"
        >
          {gift.store ?? 'Ver en la tienda'}
        </a>
      )}

      {gift.claimedByLabel === null ? null : (
        <p className="text-[12px] text-ink-soft">Reservado por {gift.claimedByLabel}</p>
      )}

      <footer className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        {definitivo ? null : (
          <>
            <button
              className={PILL_CLASS}
              disabled={pendiente}
              onClick={() => correr(() => markPurchasedAction({ id: gift.id, eventId, eventSlug }))}
              type="button"
            >
              Marcar comprado
            </button>
            {gift.status === 'reserved' ? (
              <button
                className={PILL_CLASS}
                disabled={pendiente}
                onClick={() => correr(() => releaseGiftAsAtelierAction({ id: gift.id, eventId, eventSlug }))}
                type="button"
              >
                Liberar reserva
              </button>
            ) : null}
          </>
        )}
        <button
          className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute disabled:opacity-40"
          disabled={pendiente}
          onClick={() => correr(() => removeGiftAction({ id: gift.id, eventId, eventSlug }))}
          type="button"
        >
          Eliminar
        </button>
      </footer>

      {error === null ? null : (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}
      {aviso === null ? null : (
        <p className="text-[12px] text-ink-soft" role="status">
          {aviso}
        </p>
      )}
    </article>
  )
}

export function GiftList({ eventId, eventSlug, currency, gifts }: Props) {
  if (gifts.length === 0) {
    return (
      <p className="text-[13px] text-ink-mute">
        Todavía no hay regalos en la lista. Añade el primero y el invitado lo verá en su invitación.
      </p>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {gifts.map((gift) => (
        <GiftCard key={gift.id} currency={currency} eventId={eventId} eventSlug={eventSlug} gift={gift} />
      ))}
    </div>
  )
}
