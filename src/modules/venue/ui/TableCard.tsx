'use client'

import { useState, useTransition } from 'react'
import { assignGroupAction, removeTableAction, unassignGroupAction } from '../actions'
import type { SeatedTable } from '../application/list-seating'
import type { SeatedGroupRow } from '../application/ports'

type Props = {
  eventId: string
  eventSlug: string
  table: SeatedTable
  /** Los grupos sin mesa del evento; la tarjeta filtra los que caben en esta. */
  unseated: readonly SeatedGroupRow[]
}

/**
 * El estado de la mesa se lee del color del borde: verde con sitio, ámbar casi llena,
 * rojo sin nada libre. Son `--color-ok`, `--color-warn` y `--color-danger` de
 * `tokens.css`; aquí no hay ni un hexadecimal.
 */
const estado = (table: SeatedTable): { clase: string; texto: string } => {
  if (table.free === 0) return { clase: 'border-danger text-danger', texto: 'Completa' }
  if (table.taken === 0) return { clase: 'border-line text-ink-mute', texto: 'Vacía' }
  return { clase: 'border-warn text-warn', texto: 'A medias' }
}

export function TableCard({ eventId, eventSlug, table, unseated }: Props) {
  const [elegido, setElegido] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  // Un grupo no se parte entre dos mesas: solo se ofrecen los que caben enteros.
  const caben = unseated.filter((g) => g.seats <= table.free)
  const { clase, texto } = estado(table)

  const correr = (accion: () => Promise<{ ok: boolean; message?: string; kind?: string }>) => {
    setError(null)
    setAviso(null)
    empezar(async () => {
      const r = await accion()
      if (r.ok) setAviso(r.message ?? null)
      else setError(r.message ?? 'No se pudo completar la operación.')
    })
  }

  return (
    <article className={`flex flex-col gap-4 rounded-card border bg-bg-raised p-5 ${clase}`}>
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[20px] font-light text-ink">{table.label}</h3>
        <p className="flex items-baseline gap-2">
          <span className="font-mono text-[16px] text-ink">
            {table.taken} / {table.capacity}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)]">{texto}</span>
        </p>
      </header>

      {table.groups.length === 0 ? (
        <p className="text-[13px] text-ink-mute">Nadie sentado todavía.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {table.groups.map((group) => (
            <li key={group.id} className="flex items-center justify-between gap-3 text-[13px] text-ink-soft">
              <span>{group.label}</span>
              <span className="ml-auto font-mono text-[11px] text-ink-mute">{group.seats}</span>
              <button
                type="button"
                aria-label={`Quitar de la mesa a ${group.label}`}
                disabled={pendiente}
                onClick={() => correr(() => unassignGroupAction({ eventId, eventSlug, groupId: group.id }))}
                className="rounded-pill border border-line px-3 py-1 font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute disabled:opacity-40"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

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

      <footer className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={pendiente}
          onClick={() => correr(() => removeTableAction({ id: table.id, eventId, eventSlug }))}
          className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute disabled:opacity-40"
        >
          Eliminar mesa
        </button>
      </footer>

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
