'use client'

import { useState, useTransition } from 'react'
import { formatAmount } from '../domain/money'
import type { FundView } from '../application/list-registry'
import { removeFundAction } from '@/app/_acciones/registry/actions'
import { ContributionForm } from './ContributionForm'
import { FundForm } from './FundForm'
import { useT } from '@/shared/i18n/idioma-navegador'

type Props = { eventId: string; eventSlug: string; currency: string; view: FundView }

export function FundCard({ eventId, eventSlug, currency, view }: Props) {
  const t = useT()
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)
  const [aportando, setAportando] = useState(false)
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

  // Oscura, como en la maqueta (E58): un fondo en efectivo no es una tarjeta más de la lista. Lo recaudado en grande,
  // su barra dorada, cuántos aportes y, a mano, registrar uno o editar el fondo.
  const sinCentimos = (cents: number) => formatAmount(cents, currency).replace(/,00$/, '')
  return (
    <article className="flex flex-col gap-3.5 rounded-[16px] bg-linear-to-br from-shell to-shell-deep p-6 text-shell-ink">
      <header className="flex flex-col gap-1">
        <h3 className="font-display text-[26px] leading-tight font-medium">{fund.name}</h3>
        {fund.description === null ? null : <p className="text-[13.5px] text-shell-ink/70">{fund.description}</p>}
      </header>

      <p className="flex flex-wrap items-baseline gap-2">
        <span className="font-display text-[34px] leading-none font-medium [font-variant-numeric:lining-nums]">{sinCentimos(progress.raisedCents)}</span>
        <span className="text-[13.5px] text-shell-ink/70">{t('de', 'of')} {sinCentimos(progress.goalCents)}</span>
      </p>

      {/*
        El ancho sale de `progress.percent`, que la aplicación ya recortó al 100. Si la
        barra recibiera el porcentaje crudo, un fondo al 140 % se saldría del contenedor.
      */}
      <div className="h-1.5 overflow-hidden rounded-full bg-shell-ink/15">
        <div
          aria-label={`Recaudado para ${fund.name}`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progress.percent}
          className="h-full rounded-full bg-gold transition-[width] duration-500 motion-reduce:transition-none"
          role="progressbar"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      {progress.exceeded ? (
        <p className="text-[13px] text-gold-light">{t('Meta superada:', 'Goal exceeded:')} {formatAmount(progress.raisedCents - progress.goalCents, currency)} {t('de más', 'over')}</p>
      ) : null}

      {contributions.length === 0 ? (
        <p className="text-[13.5px] text-shell-ink/70">{t('Todavía no hay aportaciones a este fondo.', 'No contributions to this fund yet.')}</p>
      ) : (
        <details className="group text-[13.5px]">
          <summary className="cursor-pointer list-none text-shell-ink/75 hover:text-shell-ink [&::-webkit-details-marker]:hidden">
            {contributions.length} {contributions.length === 1 ? t('aporte', 'contribution') : t('aportes', 'contributions')}
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5 border-t border-shell-ink/15 pt-2.5">
            {contributions.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-3">
                <span>{c.displayName}</span>
                <span className="text-gold-light [font-variant-numeric:tabular-nums]">+{formatAmount(c.amountCents, currency)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/*
        Lo recaudado y la barra siguen a la vista mientras se corrige: son justo lo que explica por qué se baja la meta.
      */}
      {editando ? (
        <div className="border-t border-shell-ink/15 pt-4">
          <FundForm eventId={eventId} eventSlug={eventSlug} fund={fund} onDone={() => setEditando(false)} />
        </div>
      ) : aportando ? (
        <div className="border-t border-shell-ink/15 pt-4">
          <ContributionForm eventId={eventId} eventSlug={eventSlug} fundId={fund.id} />
        </div>
      ) : null}

      {editando ? null : (
        <footer className="mt-1 flex flex-wrap items-center gap-2.5">
          <button
            aria-expanded={aportando}
            className="inline-flex min-h-10 cursor-pointer items-center rounded-[10px] bg-gold px-4 text-[14px] font-medium text-shell-deep transition-colors hover:bg-gold-light"
            onClick={() => setAportando((v) => !v)}
            type="button"
          >
            {aportando ? t('Cerrar', 'Close') : t('Registrar un aporte', 'Record a contribution')}
          </button>
          <button
            aria-label={t('Editar fondo', 'Edit fund')}
            className="inline-flex min-h-10 cursor-pointer items-center rounded-[10px] border border-shell-ink/30 bg-bg-raised px-4 text-[14px] font-medium text-ink disabled:opacity-40"
            disabled={pendiente}
            onClick={() => setEditando(true)}
            type="button"
          >
            {t('Editar', 'Edit')}
          </button>
          <button className="ml-auto cursor-pointer text-[13px] text-shell-ink/65 hover:text-shell-ink disabled:opacity-40" disabled={pendiente} onClick={borrar} type="button">
            {t('Eliminar fondo', 'Delete fund')}
          </button>
        </footer>
      )}

      {error === null ? null : (
        <p className="text-[13px] text-gold-light" role="alert">
          {error}
        </p>
      )}
      {aviso === null ? null : (
        <p className="text-[13px] text-shell-ink/75" role="status">
          {aviso}
        </p>
      )}
    </article>
  )
}
