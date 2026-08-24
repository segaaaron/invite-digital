'use client'

import { useState, useTransition } from 'react'
import { formatAmount } from '../domain/money'
import type { FundView } from '../application/list-registry'
import { removeFundAction } from '../actions'
import { ContributionForm } from './ContributionForm'
import { FundForm } from './FundForm'

type Props = { eventId: string; eventSlug: string; currency: string; view: FundView }

export function FundCard({ eventId, eventSlug, currency, view }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)
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

  // Oscura, como en la maqueta: un fondo en efectivo no es una tarjeta más de la lista,
  // y el contraste es lo que lo separa de los regalos físicos.
  return (
    <article className="flex flex-col gap-4 rounded-[18px] bg-linear-to-br from-shell to-shell-deep p-6 text-shell-ink shadow-card">
      <header className="flex flex-col gap-1">
        <p className="font-mono text-[9px] tracking-[0.35em] uppercase opacity-55">Fondo en efectivo</p>
        <h3 className="font-display text-[24px] font-light italic">{fund.name}</h3>
        {fund.description === null ? null : <p className="text-[12px] opacity-70">{fund.description}</p>}
      </header>

      <p className="flex items-baseline gap-2">
        <span className="font-display text-[30px] font-light [font-variant-numeric:lining-nums]">
          {formatAmount(progress.raisedCents, currency)}
        </span>
        <span className="font-mono text-[11px] opacity-60">de {formatAmount(progress.goalCents, currency)}</span>
      </p>

      {/*
        El ancho sale de `progress.percent`, que la aplicación ya recortó al 100. Si la
        barra recibiera el porcentaje crudo, un fondo al 140 % se saldría del contenedor.
      */}
      <div className="h-2 overflow-hidden rounded-[var(--radius-pill)] bg-white/10">
        <div
          aria-label={`Recaudado para ${fund.name}`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progress.percent}
          className="h-full rounded-[var(--radius-pill)] bg-linear-to-r from-[var(--color-gold-light)] to-gold transition-[width] duration-500 motion-reduce:transition-none"
          role="progressbar"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      {progress.exceeded ? (
        <p className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-[var(--color-gold-light)] uppercase">
          Meta superada · {formatAmount(progress.raisedCents - progress.goalCents, currency)} de más
        </p>
      ) : null}

      {contributions.length === 0 ? (
        <p className="text-[12px] opacity-60">Todavía no hay aportaciones a este fondo.</p>
      ) : (
        <ul className="flex flex-col gap-2 border-t border-white/10 pt-3">
          {contributions.map((c) => (
            <li key={c.id} className="flex items-baseline justify-between gap-3 text-[13px] opacity-85">
              <span>{c.displayName}</span>
              <span className="font-mono text-[12px] text-[var(--color-gold-light)]">
                +{formatAmount(c.amountCents, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/*
        Lo recaudado, la barra y el aviso de meta superada siguen a la vista mientras se
        corrige: son justo lo que explica por qué se está bajando la meta.
      */}
      <div className="border-t border-white/10 pt-4">
        {editando ? (
          <FundForm eventId={eventId} eventSlug={eventSlug} fund={fund} onDone={() => setEditando(false)} />
        ) : (
          <ContributionForm eventId={eventId} eventSlug={eventSlug} fundId={fund.id} />
        )}
      </div>

      {editando ? null : (
        <footer className="flex flex-wrap items-center gap-4">
          <button
            className="cursor-pointer rounded-[var(--radius-pill)] border border-white/25 px-4 py-2 font-mono text-[9px] tracking-[var(--tracking-luxe)] uppercase transition-colors hover:border-white/60 disabled:opacity-40"
            disabled={pendiente}
            onClick={() => setEditando(true)}
            type="button"
          >
            Editar fondo
          </button>
          <button
            className="cursor-pointer rounded-[var(--radius-pill)] border border-white/25 px-4 py-2 font-mono text-[9px] tracking-[var(--tracking-luxe)] uppercase transition-colors hover:border-white/60 disabled:opacity-40"
            disabled={pendiente}
            onClick={borrar}
            type="button"
          >
            Eliminar fondo
          </button>
        </footer>
      )}

      {error === null ? null : (
        <p className="text-[12px] text-[var(--color-gold-light)]" role="alert">
          {error}
        </p>
      )}
      {aviso === null ? null : (
        <p className="text-[12px] opacity-75" role="status">
          {aviso}
        </p>
      )}
    </article>
  )
}
