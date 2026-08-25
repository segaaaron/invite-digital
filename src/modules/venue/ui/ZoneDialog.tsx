'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { addZoneAction, updateZoneAction } from '../actions'
import { FIELD_CLASS, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { ZONE_KINDS, type VenueZone, type ZoneKind } from '../domain/venue-zone'

const NOMBRE_CLASE: Record<ZoneKind, string> = {
  dance: 'Pista de baile',
  bar: 'Barra',
  stage: 'Mesa de honor',
  music: 'Banda / DJ',
  entrance: 'Entrada',
  kitchen: 'Cocina / servicio',
  photo: 'Photobooth',
  custom: 'Otro (personalizado)',
}

/**
 * «+ Elemento del salón» abre este diálogo, como en la maqueta: tipo y, solo si el tipo
 * es personalizado, el nombre.
 *
 * El nombre libre aparece **únicamente** con «Otro»: para los siete tipos con nombre
 * propio, pedirlo sería preguntar dos veces lo mismo y abrir la puerta a una pista de
 * baile llamada «barra».
 */
export function ZoneDialog({
  eventId,
  eventSlug,
  closeHref,
  zone,
}: {
  eventId: string
  eventSlug: string
  closeHref: string
  /** Con zona, el diálogo corrige la que ya existe; sin ella, crea una nueva. */
  zone?: VenueZone | undefined
}) {
  const router = useRouter()
  const dialogo = useRef<HTMLDialogElement>(null)
  const editando = zone !== undefined
  const [kind, setKind] = useState<ZoneKind>(zone?.kind ?? 'dance')
  const [label, setLabel] = useState(zone?.label ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const idTipo = useId()
  const idNombre = useId()

  useEffect(() => {
    const nodo = dialogo.current
    if (nodo !== null && !nodo.open) nodo.showModal()
  }, [])

  const cerrar = () => {
    dialogo.current?.close()
    router.push(closeHref)
  }

  const guardar = () => {
    const nombre = kind === 'custom' ? label.trim() : NOMBRE_CLASE[kind]
    if (nombre === '') {
      setError('Un elemento personalizado necesita un nombre para reconocerlo en el plano.')
      return
    }

    setError(null)
    empezar(async () => {
      // Corregir manda también el sitio y el tamaño: el caso de uso rehace la zona
      // entera y sin ellos volvería al centro del plano.
      const r = editando
        ? await updateZoneAction({
            id: zone.id,
            eventId,
            eventSlug,
            kind,
            label: nombre,
            x: zone.x,
            y: zone.y,
            w: zone.w,
            h: zone.h,
          })
        : await addZoneAction({ eventId, eventSlug, kind, label: nombre })
      if (!r.ok) {
        setError(r.message ?? 'No se pudo guardar el elemento.')
        return
      }
      cerrar()
    })
  }

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={`${idTipo}-titulo`}
      className="m-auto w-[min(460px,92vw)] rounded-[18px] border border-line-panel bg-bg-raised p-7 text-ink shadow-float backdrop:bg-ink/45"
      onCancel={(e) => {
        e.preventDefault()
        cerrar()
      }}
    >
      <h2 className="font-display text-[24px] font-light italic" id={`${idTipo}-titulo`}>
        {editando ? 'Editar elemento del salón' : 'Añadir elemento del salón'}
      </h2>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <label className={LABEL_CLASS} htmlFor={idTipo}>
            Tipo
          </label>
          <select
            className={FIELD_CLASS}
            id={idTipo}
            onChange={(e) => setKind(e.target.value as ZoneKind)}
            value={kind}
          >
            {ZONE_KINDS.map((k) => (
              <option key={k} value={k}>
                {NOMBRE_CLASE[k]}
              </option>
            ))}
          </select>
        </div>

        {kind === 'custom' ? (
          <div className="flex min-w-0 flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor={idNombre}>
              Nombre
            </label>
            <input
              autoFocus
              className={FIELD_CLASS}
              id={idNombre}
              maxLength={60}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej. Carpa de cigarros"
              type="text"
              value={label}
            />
          </div>
        ) : null}
      </div>

      {error === null ? null : (
        <p className="mt-4 text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-2.5">
        <PanelButton disabled={pendiente} onClick={cerrar}>
          Cancelar
        </PanelButton>
        <PanelButton variant="primary" disabled={pendiente} onClick={guardar}>
          {pendiente ? 'Guardando…' : 'Guardar'}
        </PanelButton>
      </div>
    </dialog>
  )
}
