'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { addZoneAction, updateZoneAction } from '@/app/_acciones/venue/actions'
import { FIELD_CLASS, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { ZONE_KINDS, type VenueZone, type ZoneKind } from '../domain/venue-zone'
import { useT } from '@/shared/i18n/idioma-navegador'
import type { T } from '@/shared/i18n/t'

const nombreClase = (t: T): Record<ZoneKind, string> => ({
  dance: t('Pista de baile', 'Dance floor'),
  bar: t('Barra', 'Bar'),
  stage: t('Mesa de honor', 'Head table'),
  music: t('Banda / DJ', 'Band / DJ'),
  entrance: t('Entrada', 'Entrance'),
  kitchen: t('Cocina / servicio', 'Kitchen / service'),
  photo: t('Photobooth', 'Photo booth'),
  custom: t('Otro (personalizado)', 'Other (custom)'),
})

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
  const t = useT()
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
    const nombre = kind === 'custom' ? label.trim() : nombreClase(t)[kind]
    if (nombre === '') {
      setError(t('Un elemento personalizado necesita un nombre para reconocerlo en el plano.', 'A custom element needs a name to recognise it on the floor plan.'))
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
        setError(r.message ?? t('No se pudo guardar el elemento.', 'Could not save the element.'))
        return
      }
      cerrar()
    })
  }

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={`${idTipo}-titulo`}
      className="m-auto w-[min(460px,92vw)] rounded-[20px] border border-line-panel bg-bg p-7 text-ink shadow-float backdrop:bg-shell-deep/50"
      onCancel={(e) => {
        e.preventDefault()
        cerrar()
      }}
    >
      <h2 className="font-display text-[30px] leading-tight font-medium" id={`${idTipo}-titulo`}>
        {editando ? t('Editar elemento del salón', 'Edit venue element') : t('Añadir elemento del salón', 'Add venue element')}
      </h2>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <label className={LABEL_CLASS} htmlFor={idTipo}>
            {t('Tipo', 'Type')}
          </label>
          <select
            className={FIELD_CLASS}
            id={idTipo}
            onChange={(e) => setKind(e.target.value as ZoneKind)}
            value={kind}
          >
            {ZONE_KINDS.map((k) => (
              <option key={k} value={k}>
                {nombreClase(t)[k]}
              </option>
            ))}
          </select>
        </div>

        {kind === 'custom' ? (
          <div className="flex min-w-0 flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor={idNombre}>
              {t('Nombre', 'Name')}
            </label>
            <input
              autoFocus
              className={FIELD_CLASS}
              id={idNombre}
              maxLength={60}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('Ej. Carpa de cigarros', 'E.g. Cigar tent')}
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
          {t('Cancelar', 'Cancel')}
        </PanelButton>
        <PanelButton variant="primary" disabled={pendiente} onClick={guardar} aria-busy={(pendiente) || undefined}>
          {pendiente ? t('Guardando…', 'Saving…') : t('Guardar', 'Save')}
        </PanelButton>
      </div>
    </dialog>
  )
}
