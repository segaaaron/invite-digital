'use client'

import { useState, useTransition } from 'react'
import { formatAmount } from '../domain/money'
import type { FundView } from '../application/list-registry'
import { removeFundAction } from '../actions'
import { ContributionForm } from './ContributionForm'

type Props = { eventId: string; eventSlug: string; currency: string; view: FundView }

export function FundCard({ eventId, eventSlug, currency, view }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const { fund, progress, contributions } = view

  const borrar = () => {
    setError(null)
    setAviso(null)
    empezar(async () => {
      const r = await removeFundAction({ id: fund.id, eventId, eventSlug })
      if (r.ok) setAviso(r.message ?? null)
      else setError(r.message)
    })
  }

  return (
    <article className="flex flex-col gap-4 rounded-card border border-line bg-bg-raised p-6">
      <header className="flex flex-col gap-1">
        <h3 className="font-display text-[22px] font-light text-ink">{fund.name}</h3>
        {fund.description === null ? null : <p className="text-[12px] text-ink-soft">{fund.description}</p>}
      </header>

      <p className="flex items-baseline gap-2">
        <span className="font-display text-[28px] font-light text-ink">
          {formatAmount(progress.raisedCents, currency)}
        </span>
        <span className="font-mono text-[11px] text-ink-mute">de {formatAmount(progress.goalCents, currency)}</span>
      </p>

      {/*
        El ancho sale de `progress.percent`, que la aplicación ya recortó al 100. Si la
        barra recibiera el porcentaje crudo, un fondo al 140 % se saldría del contenedor.
      */}
      <div className="h-2 overflow-hidden rounded-[var(--radius-pill)] bg-bg-sunken">
        <div
          aria-label={`Recaudado para ${fund.name}`}
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
          Meta superada · {formatAmount(progress.raisedCents - progress.goalCents, currency)} de más
        </p>
      ) : null}

      {contributions.length === 0 ? (
        <p className="text-[12px] text-ink-mute">Todavía no hay aportaciones a este fondo.</p>
      ) : (
        <ul className="flex flex-col gap-2 border-t border-line pt-3">
          {contributions.map((c) => (
            <li key={c.id} className="flex items-baseline justify-between gap-3 text-[13px] text-ink-soft">
              <span>{c.displayName}</span>
              <span className="font-mono text-[12px] text-ink">{formatAmount(c.amountCents, currency)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-line pt-4">
        <ContributionForm eventId={eventId} eventSlug={eventSlug} fundId={fund.id} />
      </div>

      <footer>
        <button
          className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute disabled:opacity-40"
          disabled={pendiente}
          onClick={borrar}
          type="button"
        >
          Eliminar fondo
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
