'use client'

import { useState, useTransition } from 'react'
import type { RegistryDictionary, RegistryMessageKey } from '@/shared/i18n/dictionary'
import { formatAmount } from '../domain/money'
import type { FundView } from '../application/list-registry'
import type { GiftRow } from '../application/ports'
import { claimGiftAction, releaseGiftAction } from '../actions'

type Props = {
  token: string
  /** El grupo de este invitado: es lo que distingue «lo reservaste tú» de «lo reservó otro». */
  groupId: string
  /**
   * Si la mesa de regalos sigue incluida en el plan del evento. La resuelve la página y
   * entra aquí como argumento: `registry` no importa `plans`.
   *
   * En `false` la lista **se congela, no desaparece**: lo ya reservado se sigue viendo
   * —quien apartó la cafetera tiene que saber que la apartó, o la compra dos veces— pero
   * no se puede reservar nada nuevo ni soltar lo reservado, porque devolvería el regalo a
   * un catálogo cerrado.
   */
  open: boolean
  currency: string
  dictionary: RegistryDictionary
  gifts: readonly GiftRow[]
  funds: readonly FundView[]
}

/**
 * El servidor devuelve la *clase* del error, no su texto: el detalle puede llevar
 * identificadores y además está en español, y esta página habla el idioma del evento.
 * Una clase que no esté en el diccionario cae en el mensaje genérico: quedarse sin
 * mensaje sería peor que dar uno impreciso.
 */
const mensajeDe = (dictionary: RegistryDictionary, kind: string): string =>
  dictionary.errors[kind as RegistryMessageKey] ?? dictionary.errors.storage_failure

function GuestGift({
  token,
  groupId,
  currency,
  dictionary,
  open,
  gift,
}: Omit<Props, 'gifts' | 'funds'> & { gift: GiftRow }) {
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const esMio = gift.status === 'reserved' && gift.claimedByGroupId === groupId

  const correr = (accion: () => Promise<{ ok: boolean; kind?: string }>) => {
    setError(null)
    empezar(async () => {
      const r = await accion()
      if (!r.ok) setError(mensajeDe(dictionary, r.kind ?? 'storage_failure'))
    })
  }

  const etiqueta = (): string | null => {
    if (gift.status === 'purchased') return dictionary.purchased
    if (esMio) return dictionary.reservedByYou
    // Se dice que está reservado, pero NO por quién: la etiqueta del grupo que lo apartó
    // es un dato de otro invitado y no tiene por qué cruzar a esta página.
    if (gift.status === 'reserved') return dictionary.reservedByOther
    return null
  }

  const texto = etiqueta()

  return (
    <li className="flex flex-col gap-2 rounded-card border border-line p-5">
      <p className="font-display text-[18px] font-light text-ink">{gift.name}</p>
      <p className="font-mono text-[12px] text-ink-soft">{formatAmount(gift.priceCents, currency)}</p>

      {gift.url === null ? (
        gift.store === null ? null : <p className="text-[12px] text-ink-mute">{gift.store}</p>
      ) : (
        <a
          className="text-[12px] text-gold-deep underline underline-offset-4"
          href={gift.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {gift.store ?? dictionary.viewInStore}
        </a>
      )}

      {texto === null ? null : (
        <p className="font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{texto}</p>
      )}

      {open && gift.status === 'available' ? (
        <button
          className="self-start rounded-[var(--radius-pill)] border border-line px-5 py-2 font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink disabled:opacity-40"
          disabled={pendiente}
          onClick={() => correr(() => claimGiftAction({ token, giftId: gift.id }))}
          type="button"
        >
          {pendiente ? dictionary.reserving : dictionary.reserve}
        </button>
      ) : null}

      {open && esMio ? (
        <button
          className="self-start rounded-[var(--radius-pill)] border border-line px-5 py-2 font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute disabled:opacity-40"
          disabled={pendiente}
          onClick={() => correr(() => releaseGiftAction({ token, giftId: gift.id }))}
          type="button"
        >
          {pendiente ? dictionary.releasing : dictionary.release}
        </button>
      ) : null}

      {error === null ? null : (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}

function GuestFund({ currency, dictionary, view }: { currency: string; dictionary: RegistryDictionary; view: FundView }) {
  const { fund, progress } = view

  return (
    <li className="flex flex-col gap-3 rounded-card border border-line p-5">
      <p className="font-display text-[18px] font-light text-ink">{fund.name}</p>
      {fund.description === null ? null : <p className="text-[12px] text-ink-soft">{fund.description}</p>}

      <p className="font-mono text-[12px] text-ink-soft">
        {dictionary.fundRaised}: {formatAmount(progress.raisedCents, currency)} · {dictionary.fundGoal}:{' '}
        {formatAmount(progress.goalCents, currency)}
      </p>

      {/* El ancho ya viene recortado al 100 desde la aplicación. */}
      <div className="h-2 overflow-hidden rounded-[var(--radius-pill)] bg-bg-sunken">
        <div
          aria-label={fund.name}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progress.percent}
          className="h-full rounded-[var(--radius-pill)] bg-gold transition-[width] duration-500 motion-reduce:transition-none"
          role="progressbar"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      {progress.exceeded ? (
        <p className="font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ok">
          {dictionary.fundExceeded}
        </p>
      ) : null}
    </li>
  )
}

export function GuestRegistry({ token, groupId, currency, dictionary, open, gifts, funds }: Props) {
  // Sin nada que enseñar, el bloque no existe: una sección con un título y un hueco
  // debajo hace que la invitación parezca rota.
  if (gifts.length === 0 && funds.length === 0) return null

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{dictionary.title}</h2>
      <p className="text-[13px] leading-[1.7] text-ink-soft">{open ? dictionary.intro : dictionary.closed}</p>

      {gifts.length === 0 ? null : (
        <ul className="flex flex-col gap-3">
          {gifts.map((gift) => (
            <GuestGift
              key={gift.id}
              currency={currency}
              dictionary={dictionary}
              gift={gift}
              groupId={groupId}
              open={open}
              token={token}
            />
          ))}
        </ul>
      )}

      {funds.length === 0 ? null : (
        <>
          <h3 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{dictionary.fundsTitle}</h3>
          <ul className="flex flex-col gap-3">
            {funds.map((view) => (
              <GuestFund key={view.fund.id} currency={currency} dictionary={dictionary} view={view} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
