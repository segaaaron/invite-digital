'use client'

import { useState, useTransition } from 'react'
import { PinIcon } from '@/shared/design/ui/icons'
import { assignGroupAction, removeTableAction, unassignGroupAction, updateTableAction } from '@/app/_acciones/venue/actions'
import type { SeatedTable } from '../application/list-seating'
import type { SeatedGroupRow } from '../application/ports'
import { IconButton } from '@/shared/design/ui/panel/PanelKit'
import { seatRing } from '../domain/seat-ring'
import { matchesSearch, useSeatingSearch } from './SeatingSearchContext'
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
  /** Cómo se llama la mesa principal en esta fiesta: «De los novios» o «De la quinceañera». */
  mesaPrincipal?: string
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

export function TableCard({ eventId, eventSlug, table, unseated, mesaPrincipal = 'De los novios' }: Props) {
  const [elegido, setElegido] = useState('')
  const [editando, setEditando] = useState(false)
  const [label, setLabel] = useState(table.label)
  const [capacity, setCapacity] = useState(String(table.capacity))
  const [shape, setShape] = useState<TableShape>(table.shape)
  const [notes, setNotes] = useState(table.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()
  // Borrar una mesa deja sin sitio a todos sus grupos y no tiene deshacer: hace falta un
  // segundo clic. El primero pregunta; el segundo borra.
  const [porBorrar, setPorBorrar] = useState(false)
  const { termino } = useSeatingSearch()
  const resaltada = matchesSearch(termino, table.groups.map((g) => g.label))

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
    <article
      className={`flex flex-col gap-4 rounded-[18px] border bg-linear-to-b from-bg-top to-white p-5 shadow-card ${clase} ${
        resaltada ? 'ring-4 ring-gold/50' : ''
      }`}
    >
      {/* Con el estado y los dos iconos a la derecha, «Mesa 01» se partía en dos líneas en
          tarjetas de 260 px. El título no se parte: si no cabe, lo que baja es la cola. */}
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-display text-[20px] font-light whitespace-nowrap text-ink">{table.label}</h3>
        <p className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="font-mono text-[13px] text-ink-soft">
            {table.taken} / {table.capacity}
          </span>
          <span className="font-mono text-[10.5px] tracking-[var(--tracking-luxe)] uppercase">{texto}</span>
          <IconButton disabled={pendiente} label={`Editar ${table.label}`} onClick={() => setEditando(true)}>
            ✎
          </IconButton>
          {porBorrar ? (
            <>
              <button
                className="cursor-pointer rounded-[var(--radius-pill)] border border-danger/40 bg-white px-2.5 py-1 font-mono text-[10.5px] tracking-[0.2em] text-danger-deep uppercase"
                disabled={pendiente}
                onClick={() => correr(() => removeTableAction({ id: table.id, eventId, eventSlug }))}
                type="button"
              >
                Borrar
              </button>
              <button
                className="cursor-pointer font-mono text-[10.5px] tracking-[0.2em] text-ink-mute uppercase"
                onClick={() => setPorBorrar(false)}
                type="button"
              >
                No
              </button>
            </>
          ) : (
            <IconButton disabled={pendiente} label={`Eliminar ${table.label}`} onClick={() => setPorBorrar(true)}>
              ✕
            </IconButton>
          )}
        </p>
      </header>

      {table.notes === null ? null : (
        <p className="flex items-start gap-1.5 rounded-lg bg-bg-raised px-2.5 py-1.5 text-[11px] text-ink-soft">
          <PinIcon className="mt-px shrink-0" />
          {table.notes}
        </p>
      )}

      {/* La barra de la maqueta: dorada mientras se llena, verde cuando la mesa está
          resuelta. Dice de un vistazo lo mismo que el contador, pero sin leerlo. */}
      <div className="h-1 overflow-hidden rounded-sm bg-bg-sunken">
        <div
          className={`h-full rounded-sm ${table.free === 0 ? 'bg-sage' : 'bg-gold'}`}
          style={{ width: `${table.capacity === 0 ? 0 : Math.min(100, (table.taken / table.capacity) * 100)}%` }}
        />
      </div>

      {/* La mesa dibujada con sus sillas, como en la maqueta: se ve de un vistazo cuánto
          queda libre sin leer el contador. */}
      <div aria-hidden className="relative mx-auto size-[150px]">
        {seatRing(table.capacity, table.groups, table.shape).map((silla, indice) => (
          <span
            key={indice}
            className={`absolute flex size-[22px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border font-mono text-[10.5px] ${
              silla.occupant === null
                ? 'border-line-panel bg-bg-sunken text-ink-mute'
                : silla.vip
                  ? 'border-gold-deep bg-linear-to-br from-[var(--color-gold-light)] to-gold-deep text-white'
                  : 'border-sage bg-linear-to-br from-sage-light to-sage text-white shadow-[0_2px_6px_rgb(var(--color-shadow-rgb)/0.25)]'
            }`}
            style={{ left: `${silla.x}%`, top: `${silla.y}%` }}
          >
            {silla.initial ?? indice + 1}
          </span>
        ))}
        <span
          className={`absolute top-1/2 left-1/2 flex size-[74px] -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-bg-sunken font-mono text-[15px] text-ink ${
            table.shape === 'round' ? 'rounded-full' : 'rounded-[14px]'
          }`}
        >
          #{table.label.replace(/^mesa\s*/i, '') || table.label}
        </span>
      </div>

      {table.groups.length === 0 ? (
        <p className="text-[12px] text-ink-mute italic">Sin invitados asignados</p>
      ) : (
        // Chips con su aspa, como la maqueta: una lista de filas con botones «Quitar»
        // ocupaba el triple y competía con la mesa dibujada.
        <ul className="flex flex-wrap gap-2">
          {table.groups.map((group) => (
            <li
              key={group.id}
              className="flex items-center gap-1.5 rounded-pill bg-pill-pending px-2.5 py-1 text-[11px] text-ink"
            >
              <span>{group.label}</span>
              {group.dietary === true ? (
                <span aria-label="con restricción alimentaria" title="Con restricción alimentaria">
                  🍽
                </span>
              ) : null}
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

      {table.free === 0 ? (
        <p className="text-[12px] text-ink-mute">Sin sitios libres.</p>
      ) : caben.length === 0 ? (
        <p className="text-[12px] text-ink-mute">
          {unseated.length === 0 ? 'Nadie pendiente de sentar.' : `Ninguna invitación pendiente cabe en los ${table.free} sitios que quedan.`}
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`sentar-${table.id}`}>
            Invitación a sentar en {table.label}
          </label>
          {/* Elegir **es** sentar, como en la maqueta: el botón aparte era un paso de más
              en la pantalla donde se reparte el salón entero grupo a grupo. */}
          <select
            id={`sentar-${table.id}`}
            value={elegido}
            onChange={(e) => {
              const id = e.target.value
              setElegido('')
              if (id !== '') correr(() => assignGroupAction({ eventId, eventSlug, groupId: id, tableId: table.id }))
            }}
            className="min-w-0 flex-1 rounded-pill border border-line-panel-strong bg-white px-3 py-2 text-[13px] text-ink"
          >
            <option value="">+ asignar invitado…</option>
            {caben.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label} · {g.seats}
              </option>
            ))}
          </select>
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
                    {s === 'sweetheart' ? mesaPrincipal : NOMBRE_FORMA[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 font-mono text-[10.5px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
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
              className="rounded-pill border border-line px-4 py-2 font-mono text-[10.5px] uppercase tracking-[var(--tracking-luxe)] text-ink disabled:opacity-40"
              disabled={pendiente}
              onClick={guardar}
              type="button"
            >
              Guardar cambios
            </button>
            <button
              className="font-mono text-[10.5px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute disabled:opacity-40"
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
