'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { addTableAction } from '@/app/_acciones/venue/actions'
import { FIELD_CLASS, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { TABLE_SHAPES, type TableShape } from '../domain/venue-table'
import { useT } from '@/shared/i18n/idioma-navegador'
import type { T } from '@/shared/i18n/t'

export const nombreForma = (t: T): Record<TableShape, string> => ({
  round: t('Redonda', 'Round'),
  rect: t('Rectangular', 'Rectangular'),
  sweetheart: t('De los novios', 'Sweetheart'),
  imperial: t('Imperial', 'Imperial'),
})

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
export function TableDialog({
  eventId,
  eventSlug,
  closeHref,
  mesaPrincipal,
}: {
  eventId: string
  eventSlug: string
  closeHref: string
  /** Cómo se llama la mesa principal en esta fiesta: «De los novios» o «De la quinceañera». */
  mesaPrincipal?: string | undefined
}) {
  const t = useT()
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
    // `replace`, no `push`: con `push`, volver atrás reabre el diálogo.
    router.replace(closeHref)
  }

  const guardar = () => {
    const sitios = Number(capacity)
    if (!Number.isInteger(sitios) || sitios < 1) {
      setError(t('La capacidad es un número entero de sitios. Una mesa sin sitios no es una mesa.', 'Capacity is a whole number of seats. A table without seats is not a table.'))
      return
    }

    setError(null)
    empezar(async () => {
      const r = await addTableAction({
        eventId,
        eventSlug,
        label,
        capacity: sitios,
        shape,
        notes: notes.trim() || null,
      })
      if (!r.ok) {
        setError(r.message ?? t('No se pudo crear la mesa.', 'Could not create the table.'))
        return
      }
      cerrar()
    })
  }

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={`${idLabel}-titulo`}
      className="m-auto w-[min(480px,92vw)] rounded-[20px] border border-line-panel bg-bg p-7 text-ink shadow-float backdrop:bg-shell-deep/50"
      onCancel={(e) => {
        e.preventDefault()
        cerrar()
      }}
    >
      <h2 className="font-display text-[30px] leading-tight font-medium" id={`${idLabel}-titulo`}>
        {t('Añadir mesa', 'Add table')}
      </h2>

      <div className="mt-5 flex flex-col gap-4">
        <label className={LABEL_CLASS} htmlFor={idLabel}>
          {t('Nombre de la mesa', 'Table name')}
          <input
            autoFocus
            className={FIELD_CLASS}
            id={idLabel}
            maxLength={60}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('Mesa 01', 'Table 01')}
            type="text"
            value={label}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={LABEL_CLASS} htmlFor={idCupo}>
            {t('Capacidad (asientos)', 'Capacity (seats)')}
            <input
              className={FIELD_CLASS}
              id={idCupo}
              min={1}
              onChange={(e) => setCapacity(e.target.value)}
              type="number"
              value={capacity}
            />
          </label>

          <div className="flex min-w-0 flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor={idForma}>
              {t('Forma', 'Shape')}
            </label>
            <select
              className={FIELD_CLASS}
              id={idForma}
              onChange={(e) => setShape(e.target.value as TableShape)}
              value={shape}
            >
              {TABLE_SHAPES.map((s) => (
                <option key={s} value={s}>
                  {s === 'sweetheart' ? (mesaPrincipal ?? nombreForma(t)[s]) : nombreForma(t)[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className={LABEL_CLASS} htmlFor={idNotas}>
          {t('Notas (opcional)', 'Notes (optional)')}
          <input
            className={FIELD_CLASS}
            id={idNotas}
            maxLength={200}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('Ej. cerca del baño, acceso silla de ruedas…', 'E.g. near the restroom, wheelchair access…')}
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
        <PanelButton disabled={pendiente} onClick={cerrar}>
          {t('Cancelar', 'Cancel')}
        </PanelButton>
        <PanelButton variant="primary" disabled={pendiente} onClick={guardar} aria-busy={(pendiente) || undefined}>
          {pendiente ? t('Guardando…', 'Saving…') : t('Guardar', 'Save')}
        </PanelButton>
      </div>
    </dialog>
  )
}
