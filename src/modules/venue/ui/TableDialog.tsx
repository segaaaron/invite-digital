'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { addTableAction } from '../actions'
import { TABLE_SHAPES, type TableShape } from '../domain/venue-table'

const NOMBRE_FORMA: Record<TableShape, string> = {
  round: 'Redonda',
  rect: 'Rectangular',
  sweetheart: 'De los novios',
  imperial: 'Imperial',
}

const CAMPO =
  'w-full rounded-[14px] border border-line-panel-strong bg-white px-4 py-3 text-[14px] text-ink outline-none transition-colors focus-visible:border-ink'
const ROTULO = 'flex flex-col gap-2 font-mono text-[9px] tracking-[0.3em] text-ink-mute uppercase'

/**
 * «+ Añadir mesa» abre este diálogo, como en la maqueta: nombre, capacidad, forma y
 * notas, con Cancelar y Guardar.
 *
 * Es un `<dialog>` nativo abierto con `showModal()`: trae gratis el foco atrapado
 * dentro, el cierre con Escape y el fondo inerte. Una capa hecha a mano con `div`s deja
 * el resto de la página navegable con el tabulador por detrás del modal.
 *
 * Está abierto porque la dirección lo dice (`?panel=mesa`), no por estado del cliente:
 * cada alta revalida el árbol y un `useState` se perdería en ese remontaje.
 */
export function TableDialog({ eventId, eventSlug, closeHref }: { eventId: string; eventSlug: string; closeHref: string }) {
  const router = useRouter()
  const dialogo = useRef<HTMLDialogElement>(null)
  const [label, setLabel] = useState('')
  const [capacity, setCapacity] = useState('8')
  const [shape, setShape] = useState<TableShape>('round')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const idLabel = useId()
  const idCupo = useId()
  const idForma = useId()
  const idNotas = useId()

  // `showModal()` es lo único que hace inerte el fondo; el atributo `open` del marcado
  // abre el diálogo pero deja la página de detrás navegable con el tabulador.
  useEffect(() => {
    const nodo = dialogo.current
    if (nodo !== null && !nodo.open) nodo.showModal()
  }, [])

  const cerrar = () => {
    dialogo.current?.close()
    router.push(closeHref)
  }

  const guardar = () => {
    const sitios = Number(capacity)
    if (!Number.isInteger(sitios) || sitios < 1) {
      setError('La capacidad es un número entero de sitios. Una mesa sin sitios no es una mesa.')
      return
    }

    setError(null)
    empezar(async () => {
      const r = await addTableAction({ eventId, eventSlug, label, capacity: sitios, shape, notes: notes.trim() || null })
      if (!r.ok) {
        setError(r.message ?? 'No se pudo crear la mesa.')
        return
      }
      cerrar()
    })
  }

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={`${idLabel}-titulo`}
      className="m-auto w-[min(480px,92vw)] rounded-[18px] border border-line-panel bg-bg-raised p-7 text-ink shadow-float backdrop:bg-ink/45"
      onCancel={(e) => {
        e.preventDefault()
        cerrar()
      }}
    >
      <h2 className="font-display text-[24px] font-light italic" id={`${idLabel}-titulo`}>
        Añadir mesa
      </h2>

      <div className="mt-5 flex flex-col gap-4">
        <label className={ROTULO} htmlFor={idLabel}>
          Nombre de la mesa
          <input
            autoFocus
            className={CAMPO}
            id={idLabel}
            maxLength={60}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Mesa 01"
            type="text"
            value={label}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={ROTULO} htmlFor={idCupo}>
            Capacidad (asientos)
            <input
              className={CAMPO}
              id={idCupo}
              min={1}
              onChange={(e) => setCapacity(e.target.value)}
              type="number"
              value={capacity}
            />
          </label>

          <label className={ROTULO} htmlFor={idForma}>
            Forma
            <select className={CAMPO} id={idForma} onChange={(e) => setShape(e.target.value as TableShape)} value={shape}>
              {TABLE_SHAPES.map((s) => (
                <option key={s} value={s}>
                  {NOMBRE_FORMA[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={ROTULO} htmlFor={idNotas}>
          Notas (opcional)
          <input
            className={CAMPO}
            id={idNotas}
            maxLength={200}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. cerca del baño, acceso silla de ruedas…"
            type="text"
            value={notes}
          />
        </label>
      </div>

      {error === null ? null : (
        <p className="mt-4 text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-2.5">
        <button
          className="cursor-pointer rounded-[var(--radius-pill)] border border-line-panel-strong bg-white px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-ink uppercase transition-colors hover:border-ink disabled:opacity-40"
          disabled={pendiente}
          onClick={cerrar}
          type="button"
        >
          Cancelar
        </button>
        <button
          className="cursor-pointer rounded-[var(--radius-pill)] border border-shell-deep bg-linear-to-b from-shell to-shell-deep px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-white uppercase transition-all duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
          disabled={pendiente}
          onClick={guardar}
          type="button"
        >
          {pendiente ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </dialog>
  )
}
