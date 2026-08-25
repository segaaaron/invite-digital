'use client'

import { useState, useTransition } from 'react'
import { addTableAction } from '../actions'
import { TABLE_SHAPES, type TableShape } from '../domain/venue-table'

type Props = { eventId: string; eventSlug: string }

const NOMBRE_FORMA: Record<TableShape, string> = {
  round: 'Redonda',
  rect: 'Rectangular',
  sweetheart: 'De los novios',
  imperial: 'Imperial',
}

export function SeatingToolbar({ eventId, eventSlug }: Props) {
  const [label, setLabel] = useState('')
  const [capacity, setCapacity] = useState('8')
  const [shape, setShape] = useState<TableShape>('round')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const correr = (accion: () => Promise<{ ok: boolean; message?: string }>, alAcabar?: () => void) => {
    setError(null)
    setAviso(null)
    empezar(async () => {
      const r = await accion()
      if (!r.ok) {
        setError(r.message ?? 'No se pudo completar la operación.')
        return
      }
      setAviso(r.message ?? null)
      alAcabar?.()
    })
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" htmlFor="mesa-label">
            Etiqueta
          </label>
          <input
            id="mesa-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Mesa 01"
            className="rounded-pill border border-line-panel bg-white px-3 py-2 text-[13px] text-ink"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" htmlFor="mesa-cupo">
            Cupo
          </label>
          <input
            id="mesa-cupo"
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-20 rounded-pill border border-line-panel bg-white px-3 py-2 text-[13px] text-ink"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" htmlFor="mesa-forma">
            Forma
          </label>
          <select
            id="mesa-forma"
            value={shape}
            onChange={(e) => setShape(e.target.value as TableShape)}
            className="rounded-pill border border-line-panel bg-white px-3 py-2 text-[13px] text-ink"
          >
            {TABLE_SHAPES.map((s) => (
              <option key={s} value={s}>
                {NOMBRE_FORMA[s]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={pendiente}
          onClick={() =>
            correr(
              () => addTableAction({ eventId, eventSlug, label, capacity: Number(capacity), shape }),
              () => setLabel(''),
            )
          }
          className="cursor-pointer rounded-pill border border-shell-deep bg-linear-to-b from-shell to-shell-deep px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-white uppercase disabled:opacity-40"
        >
          Añadir mesa
        </button>
      </div>

      {error === null ? (
        <p className="min-h-4 text-[12px] text-ink-soft" role="status">
          {aviso ?? ''}
        </p>
      ) : (
        // Un alta que falla en silencio deja al atelier creyendo que la mesa existe.
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
