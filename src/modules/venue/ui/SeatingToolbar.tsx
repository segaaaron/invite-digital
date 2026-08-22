'use client'

import { useState, useTransition } from 'react'
import { addTableAction, autoAssignAction } from '../actions'
import type { SeatedTable } from '../application/list-seating'
import type { SeatedGroupRow } from '../application/ports'
import { TABLE_SHAPES, type TableShape } from '../domain/venue-table'

type Props = {
  eventId: string
  eventSlug: string
  tables: readonly SeatedTable[]
  unseated: readonly SeatedGroupRow[]
  totalSeats: number
  totalConfirmed: number
}

const NOMBRE_FORMA: Record<TableShape, string> = {
  round: 'Redonda',
  rect: 'Rectangular',
  sweetheart: 'De los novios',
  imperial: 'Imperial',
}

/**
 * El buscador responde a la pregunta que más se hace el día antes: «¿dónde se sienta
 * esta familia?». Busca sobre lo que ya está en pantalla, sin ir al servidor: una lista
 * de invitados cabe en memoria y un viaje por tecla no aporta nada.
 */
const buscar = (
  termino: string,
  tables: readonly SeatedTable[],
  unseated: readonly SeatedGroupRow[],
): string | null => {
  const q = termino.trim().toLocaleLowerCase()
  if (q === '') return null

  for (const table of tables) {
    const group = table.groups.find((g) => g.label.toLocaleLowerCase().includes(q))
    if (group) return `${group.label} se sienta en ${table.label}.`
  }

  const suelto = unseated.find((g) => g.label.toLocaleLowerCase().includes(q))
  if (suelto) return `${suelto.label} todavía está sin mesa.`

  return `No encontramos a nadie que se llame así.`
}

export function SeatingToolbar({ eventId, eventSlug, tables, unseated, totalSeats, totalConfirmed }: Props) {
  const [label, setLabel] = useState('')
  const [capacity, setCapacity] = useState('8')
  const [shape, setShape] = useState<TableShape>('round')
  const [termino, setTermino] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const hallazgo = buscar(termino, tables, unseated)

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
    <section className="flex flex-col gap-5 rounded-card border border-line bg-bg-raised p-5">
      <div className="flex flex-wrap items-baseline gap-6">
        <p className="flex items-baseline gap-2">
          <span aria-label="Sitios del salón" className="font-mono text-[20px] text-ink">
            {totalSeats}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">sitios</span>
        </p>
        <p className="flex items-baseline gap-2">
          <span aria-label="Comensales confirmados" className="font-mono text-[20px] text-ink">
            {totalConfirmed}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
            confirmados
          </span>
        </p>
        {unseated.length === 0 ? null : (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => correr(() => autoAssignAction({ eventId, eventSlug }))}
            className="ml-auto rounded-pill border border-line px-4 py-2 font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink disabled:opacity-40"
          >
            Repartir los que faltan
          </button>
        )}
      </div>

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
            className="rounded-pill border border-line bg-bg-top px-3 py-2 text-[13px] text-ink"
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
            className="w-20 rounded-pill border border-line bg-bg-top px-3 py-2 text-[13px] text-ink"
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
            className="rounded-pill border border-line bg-bg-top px-3 py-2 text-[13px] text-ink"
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
          className="rounded-pill border border-line px-4 py-2 font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink disabled:opacity-40"
        >
          Añadir mesa
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" htmlFor="mesa-buscar">
          Buscar grupo
        </label>
        <input
          id="mesa-buscar"
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder="¿Dónde se sienta…?"
          className="rounded-pill border border-line bg-bg-top px-3 py-2 text-[13px] text-ink"
        />
      </div>

      {error === null ? (
        <p role="status" className="min-h-4 text-[12px] text-ink-soft">
          {hallazgo ?? aviso ?? ''}
        </p>
      ) : (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
    </section>
  )
}
