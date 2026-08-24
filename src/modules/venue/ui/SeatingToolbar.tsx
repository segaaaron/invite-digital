'use client'

import { useState, useTransition } from 'react'
import { SearchField } from '@/shared/design/ui/panel/PanelKit'
import { addTableAction } from '../actions'
import type { SeatedTable } from '../application/list-seating'
import type { SeatedGroupRow } from '../application/ports'
import { TABLE_SHAPES, type TableShape } from '../domain/venue-table'

type Props = {
  eventId: string
  eventSlug: string
  tables: readonly SeatedTable[]
  unseated: readonly SeatedGroupRow[]
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

export function SeatingToolbar({ eventId, eventSlug, tables, unseated }: Props) {
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

      <div className="flex">
        <SearchField
          label="Buscar grupo"
          onChange={(e) => setTermino(e.target.value)}
          placeholder="Buscar invitado para ver su mesa…"
          value={termino}
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
