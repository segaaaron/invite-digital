'use client'

import { GiftIcon } from '@/shared/design/ui/icons'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { useState, useTransition } from 'react'
import { formatAmount } from '../domain/money'
import type { GiftStatus } from '../domain/gift'
import type { GiftRow } from '../application/ports'
import { markPurchasedAction, releaseGiftAsAtelierAction, removeGiftAction } from '@/app/_acciones/registry/actions'
import { GiftForm } from './GiftForm'
import { Pill } from '@/shared/design/ui/panel/PanelKit'

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
const ESTADO: Record<GiftStatus, { tono: 'ok' | 'pending' | 'neutro'; texto: string }> = {
  available: { tono: 'ok', texto: 'Disponible' },
  reserved: { tono: 'pending', texto: 'Reservado' },
  purchased: { tono: 'neutro', texto: 'Comprado' },
}

function GiftCard({ eventId, eventSlug, currency, gift }: Omit<Props, 'gifts'> & { gift: GiftRow }) {
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)
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

  const { tono, texto } = ESTADO[gift.status]
  // Comprado es definitivo: la tarjeta no ofrece ninguna salida de ese estado, igual que
  // el dominio no la permite. Un botón deshabilitado invitaría a intentarlo.
  const definitivo = gift.status === 'purchased'

  return (
    // La tarjeta de la maqueta (E11): nombre y estado, de qué tienda, el precio en grande y quién lo eligió.
    <article className="flex flex-col gap-2 rounded-[16px] border border-line-panel bg-bg-raised p-4.5">
      <header className="flex items-start justify-between gap-3">
        <h3 className="font-medium">{gift.name}</h3>
        <Pill tone={tono}>{texto}</Pill>
      </header>

      {/* Editando, sigue diciendo quién lo reservó: corregir el precio no borra la reserva. */}
      {editando && gift.claimedByLabel !== null ? <p className="text-[13px] text-ink-mute">Reservado por {gift.claimedByLabel}</p> : null}

      {editando ? null : (
        <>
          {gift.url === null ? (
            gift.store === null ? null : <p className="text-[13px] text-ink-mute">{gift.store}</p>
          ) : (
            <a
              className="text-[13px] text-ink-mute"
              href={gift.url}
              // `noopener noreferrer` y pestaña nueva: el destino es una tienda cualquiera y
              // no tiene por qué recibir de dónde viene el invitado ni tocar esta ventana.
              rel="noopener noreferrer"
              target="_blank"
            >
              {gift.store === null ? 'Ver en la tienda' : `${gift.store}, ver en la tienda`}
            </a>
          )}
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <p className="font-display text-[22px] font-medium">{formatAmount(gift.priceCents, currency).replace(/,00$/, '')}</p>
            <p className="text-right text-[12.5px] text-ink-mute">{gift.claimedByLabel === null ? 'Nadie lo eligió aún' : `por ${gift.claimedByLabel}`}</p>
          </div>
        </>
      )}


      {editando ? (
        <GiftForm eventId={eventId} eventSlug={eventSlug} gift={gift} onDone={() => setEditando(false)} />
      ) : (
        <footer className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line-panel pt-2.5">
          {definitivo ? null : (
            <>
              <button
                className="min-h-8 max-[767px]:min-h-11 cursor-pointer text-[13px] font-medium text-gold-deep hover:text-shell-deep disabled:opacity-40"
                disabled={pendiente}
                onClick={() => correr(() => markPurchasedAction({ id: gift.id, eventId, eventSlug }))}
                type="button"
              >
                Marcar comprado
              </button>
              {gift.status === 'reserved' ? (
                <button
                  className="min-h-8 max-[767px]:min-h-11 cursor-pointer text-[13px] font-medium text-gold-deep hover:text-shell-deep disabled:opacity-40"
                  disabled={pendiente}
                  onClick={() => correr(() => releaseGiftAsAtelierAction({ id: gift.id, eventId, eventSlug }))}
                  type="button"
                >
                  Liberar reserva
                </button>
              ) : null}
            </>
          )}
          {/*
            Corregir la ficha se ofrece también en el comprado: lo definitivo es su
            estado, no que el precio se haya escrito mal.
          */}
          <button
            className="min-h-8 max-[767px]:min-h-11 cursor-pointer text-[13px] text-ink-mute hover:text-ink disabled:opacity-40"
            disabled={pendiente}
            onClick={() => setEditando(true)}
            type="button"
          >
            Editar
          </button>
          <button
            className="min-h-8 max-[767px]:min-h-11 cursor-pointer text-[13px] text-ink-mute hover:text-ink disabled:opacity-40"
            disabled={pendiente}
            onClick={() => correr(() => removeGiftAction({ id: gift.id, eventId, eventSlug }))}
            type="button"
          >
            Eliminar
          </button>
        </footer>
      )}

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
      <EmptyState
        description="Añade lo que te gustaría recibir. Tus invitados lo ven en su invitación y lo apartan para que nadie lo repita."
        icon={<GiftIcon />}
        title="Tu mesa de regalos está vacía"
      />
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
      {gifts.map((gift) => (
        <GiftCard key={gift.id} currency={currency} eventId={eventId} eventSlug={eventSlug} gift={gift} />
      ))}
    </div>
  )
}
