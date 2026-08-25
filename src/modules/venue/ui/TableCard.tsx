'use client'

import { useState, useTransition } from 'react'
import { assignGroupAction, removeTableAction, unassignGroupAction, updateTableAction } from '../actions'
import type { SeatedTable } from '../application/list-seating'
import type { SeatedGroupRow } from '../application/ports'
import { IconButton } from '@/shared/design/ui/panel/PanelKit'
import { seatRing } from '../domain/seat-ring'
import { TABLE_SHAPES, type TableShape } from '../domain/venue-table'

const NOMBRE_FORMA: Record<TableShape, string> = {
  round: 'Redonda',
  rect: 'Rectangular',
  sweetheart: 'De los novios',
  imperial: 'Imperial',
}

type Props = {
  eventId: string
  eventSlug: string
  table: SeatedTable
  /** Los grupos sin mesa del evento; la tarjeta filtra los que caben en esta. */
  unseated: readonly SeatedGroupRow[]
}

/**
 * El estado de la mesa se lee del color, como en la maqueta: verde cuando está resuelta,
 * dorado a medias y línea tenue vacía. El rojo de «completa» decía «problema» donde lo
 * que hay es una mesa terminada.
 */
const estado = (table: SeatedTable): { clase: string; texto: string } => {
  if (table.free === 0) return { clase: 'border-sage text-sage', texto: 'Completa' }
  if (table.taken === 0) return { clase: 'border-line-panel text-ink-mute', texto: 'Vacía' }
  return { clase: 'border-gold text-gold-deep', texto: 'A medias' }
}

export function TableCard({ eventId, eventSlug, table, unseated }: Props) {
  const [elegido, setElegido] = useState('')
  const [editando, setEditando] = useState(false)
  const [label, setLabel] = useState(table.label)
  const [capacity, setCapacity] = useState(String(table.capacity))
  const [shape, setShape] = useState<TableShape>(table.shape)
  const [notes, setNotes] = useState(table.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  // Un grupo no se parte entre dos mesas: solo se ofrecen los que caben enteros.
  const caben = unseated.filter((g) => g.seats <= table.free)
  const { clase, texto } = estado(table)

  const correr = (accion: () => Promise<{ ok: boolean; message?: string; kind?: string }>, alAcabar?: () => void) => {
    setError(null)
    setAviso(null)
    empezar(async () => {
      const r = await accion()
      if (r.ok) {
        setAviso(r.message ?? null)
        alAcabar?.()
      } else setError(r.message ?? 'No se pudo completar la operación.')
    })
  }

  /**
   * Corregir el nombre o la capacidad **no toca el reparto**: quien ya está sentado
   * sigue sentado. Antes había que borrar la mesa para renombrarla, y al borrarla se
   * iban con ella todos los grupos que tenía asignados.
   */
  const guardar = () => {
    const sitios = Number(capacity)
    if (!Number.isInteger(sitios) || capacity.trim() === '') {
      setError('Los sitios de la mesa son un número entero.')
      return
    }

    correr(
      () =>
        updateTableAction({
          id: table.id,
          eventId,
          eventSlug,
          label: label.trim(),
          capacity: sitios,
          shape,
          // Vacío es «borra la nota», no «déjala como estaba»: el campo se ve, y lo que
          // se ve es lo que se guarda.
          notes: notes.trim() === '' ? null : notes.trim(),
        }),
      () => setEditando(false),
    )
  }

  return (
    <article className={`flex flex-col gap-4 rounded-[18px] border bg-linear-to-b from-bg-top to-white p-5 shadow-card ${clase}`}>
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[20px] font-light text-ink">{table.label}</h3>
        <p className="flex items-baseline gap-2">
          <span className="font-mono text-[13px] text-ink-soft">
            {table.taken} / {table.capacity}
          </span>
          <span className="font-mono text-[9px] tracking-[var(--tracking-luxe)] uppercase">{texto}</span>
          <IconButton disabled={pendiente} label={`Editar ${table.label}`} onClick={() => setEditando(true)}>
            ✎
          </IconButton>
          <IconButton
            disabled={pendiente}
            label={`Eliminar ${table.label}`}
            onClick={() => correr(() => removeTableAction({ id: table.id, eventId, eventSlug }))}
          >
            ✕
          </IconButton>
        </p>
      </header>

      {/* La mesa dibujada con sus sillas, como en la maqueta: se ve de un vistazo cuánto
          queda libre sin leer el contador. */}
      <div aria-hidden className="relative mx-auto size-[150px]">
        {seatRing(table.capacity, table.groups).map((silla, indice) => (
          <span
            key={indice}
            className={`absolute top-1/2 left-1/2 flex size-5 items-center justify-center rounded-full font-mono text-[8px] ${
              silla.occupant === null ? 'bg-bg-sunken text-ink-mute' : 'bg-sage text-white'
            }`}
            style={{
              transform: `translate(-50%, -50%) rotate(${silla.angle}deg) translateY(-58px) rotate(${-silla.angle}deg)`,
            }}
          >
            {silla.initial ?? indice + 1}
          </span>
        ))}
        <span
          className={`absolute top-1/2 left-1/2 flex size-[74px] -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-bg-sunken font-mono text-[15px] text-ink ${
            table.shape === 'round' ? 'rounded-full' : 'rounded-[14px]'
          }`}
        >
          {table.label.replace(/^mesa\s*/i, '') || table.label}
        </span>
      </div>

      {table.groups.length === 0 ? (
        <p className="text-[13px] text-ink-mute">Nadie sentado todavía.</p>
      ) : (
        // Chips con su aspa, como la maqueta: una lista de filas con botones «Quitar»
        // ocupaba el triple y competía con la mesa dibujada.
        <ul className="flex flex-wrap gap-2">
          {table.groups.map((group) => (
            <li
              key={group.id}
              className="flex items-center gap-2 rounded-pill border border-line-panel bg-bg-raised py-1 pr-1 pl-3 text-[12px] text-ink-soft"
            >
              <span>{group.label}</span>
              <span className="font-mono text-[10px] text-ink-mute">{group.seats}</span>
              <button
                type="button"
                aria-label={`Quitar de la mesa a ${group.label}`}
                disabled={pendiente}
                onClick={() => correr(() => unassignGroupAction({ eventId, eventSlug, groupId: group.id }))}
                className="flex size-5 cursor-pointer items-center justify-center rounded-full text-ink-mute transition-colors hover:bg-bg-sunken hover:text-ink disabled:opacity-40"
              >
                <span aria-hidden>✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {table.notes === null ? null : <p className="text-[12px] text-ink-soft italic">{table.notes}</p>}

      {table.free === 0 ? (
        <p className="text-[12px] text-ink-mute">Sin sitios libres.</p>
      ) : caben.length === 0 ? (
        <p className="text-[12px] text-ink-mute">
          {unseated.length === 0 ? 'Nadie pendiente de sentar.' : `Ningún grupo pendiente cabe en los ${table.free} sitios que quedan.`}
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`sentar-${table.id}`}>
            Grupo a sentar en {table.label}
          </label>
          <select
            id={`sentar-${table.id}`}
            value={elegido}
            onChange={(e) => setElegido(e.target.value)}
            className="min-w-0 flex-1 rounded-pill border border-line bg-bg-top px-3 py-2 text-[13px] text-ink"
          >
            <option value="">Elige un grupo…</option>
            {caben.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label} · {g.seats}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pendiente || elegido === ''}
            onClick={() => correr(() => assignGroupAction({ eventId, eventSlug, groupId: elegido, tableId: table.id }))}
            className="rounded-pill border border-line px-4 py-2 font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink disabled:opacity-40"
          >
            Sentar
          </button>
        </div>
      )}

      {editando ? (
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
            Nombre de la mesa
            <input
              className="rounded-pill border border-line bg-bg-top px-3 py-2 text-[13px] text-ink"
              maxLength={60}
              onChange={(e) => setLabel(e.target.value)}
              type="text"
              value={label}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
              Sitios
              <input
                className="rounded-pill border border-line bg-bg-top px-3 py-2 text-[13px] text-ink"
                min={1}
                onChange={(e) => setCapacity(e.target.value)}
                type="number"
                value={capacity}
              />
            </label>

            <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
              Forma
              <select
                className="rounded-pill border border-line bg-bg-top px-3 py-2 text-[13px] text-ink"
                onChange={(e) => setShape(e.target.value as TableShape)}
                value={shape}
              >
                {TABLE_SHAPES.map((s) => (
                  <option key={s} value={s}>
                    {NOMBRE_FORMA[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
            Notas
            <input
              className="rounded-pill border border-line-panel-strong bg-white px-3 py-2 text-[13px] text-ink"
              maxLength={200}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. cerca del baño, acceso silla de ruedas…"
              type="text"
              value={notes}
            />
          </label>

          <div className="flex flex-wrap items-center gap-4">
            <button
              className="rounded-pill border border-line px-4 py-2 font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink disabled:opacity-40"
              disabled={pendiente}
              onClick={guardar}
              type="button"
            >
              Guardar cambios
            </button>
            <button
              className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute disabled:opacity-40"
              disabled={pendiente}
              onClick={() => setEditando(false)}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {error === null ? null : (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
      {aviso === null ? null : (
        <p role="status" className="text-[12px] text-ink-soft">
          {aviso}
        </p>
      )}
    </article>
  )
}
