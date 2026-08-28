'use client'

import { useActionState } from 'react'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { type ContentActionState, uploadMediaAction } from '../actions'

const INICIAL: ContentActionState = { status: 'idle' }

const ERRORES: Record<string, string> = {
  no_file: 'Elige una imagen antes de subirla.',
  too_large: 'La imagen pesa más de 8 MB. Redúcela y vuelve a intentarlo.',
  unsupported_type: 'Ese archivo no es una imagen. Se admiten PNG, JPG, WEBP y AVIF.',
  storage_failure: 'No se pudo guardar la imagen. Vuelve a intentarlo.',
}

export type MediaItem = {
  readonly id: string
  readonly originalName: string
  readonly byteSize: number
}

type Props = {
  readonly eventId: string
  readonly eventSlug: string
  readonly items: readonly MediaItem[]
}

const enKilobytes = (bytes: number): string => `${Math.max(1, Math.round(bytes / 1024))} KB`

/**
 * Las fotografías de la invitación: se suben aquí y se usan por su identificador.
 *
 * El identificador se enseña **a la vista y copiable** porque es lo que el atelier pega en
 * `hero.portraitImageId`, en una casilla de la galería o en un icono del itinerario. Sin
 * enseñarlo, subir una foto no serviría de nada: quedaría guardada y sin forma de
 * referirse a ella.
 *
 * La vista previa usa la misma ruta que la invitación —`/media/<id>`—, así que si aquí se
 * ve, en la invitación también; y si el evento lleva contraseña, las dos responden igual.
 */
export function EventMediaPanel({ eventId, eventSlug, items }: Props) {
  const [state, formAction, isPending] = useActionState(uploadMediaAction, INICIAL)
  const error = state.status === 'error' ? (ERRORES[state.message] ?? ERRORES.storage_failure) : null

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-3">
        <input name="eventId" readOnly type="hidden" value={eventId} />
        <input name="eventSlug" readOnly type="hidden" value={eventSlug} />

        <label className="flex flex-col gap-1.5 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
          Subir una fotografía
          <input
            accept="image/png,image/jpeg,image/webp,image/avif"
            className="w-full rounded-[10px] border border-[var(--color-line-panel)] bg-bg-top px-3 py-2 text-[13px] text-ink file:mr-3 file:rounded-[var(--radius-pill)] file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-[11px] file:text-bg-raised"
            name="file"
            type="file"
          />
        </label>

        {error === null ? null : (
          <p className="text-[12px] text-gold-deep" role="alert">
            {error}
          </p>
        )}
        {state.status === 'success' ? (
          <p aria-live="polite" className="text-[12px] text-ink-soft" role="status">
            Subida. Copia su identificador y pégalo en el bloque donde quieras que salga.
          </p>
        ) : null}

        <div>
          <PanelButton disabled={isPending} type="submit">
            {isPending ? 'Subiendo…' : 'Subir'}
          </PanelButton>
        </div>
      </form>

      {items.length === 0 ? (
        <p className="text-[13px] leading-[1.7] text-ink-soft">
          Todavía no hay fotografías. Los diseños funcionan sin ellas: enseñan su marcador hasta que subas la tuya.
        </p>
      ) : (
        <ul className="grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
          {items.map((imagen) => (
            <li className="flex flex-col gap-1.5" key={imagen.id}>
              {/* eslint-disable-next-line @next/next/no-img-element -- la sirve /media/[id],
                  que no pasa por el optimizador: lleva la puerta de contraseña del evento. */}
              <img
                alt={imagen.originalName}
                className="aspect-square w-full rounded-[10px] border border-[var(--color-line-panel)] object-cover"
                loading="lazy"
                src={`/media/${imagen.id}`}
              />
              <span className="truncate text-[11px] text-ink" title={imagen.originalName}>
                {imagen.originalName}
              </span>
              {/* El identificador, copiable: es lo que se pega en el bloque de contenido. */}
              <input
                aria-label={`Identificador de ${imagen.originalName}`}
                className="w-full rounded-[8px] border border-[var(--color-line-panel)] bg-bg-top px-2 py-1 font-mono text-[10px] text-ink-soft"
                onFocus={(evento) => evento.target.select()}
                readOnly
                value={imagen.id}
              />
              <span className="font-mono text-[10px] text-ink-mute">{enKilobytes(imagen.byteSize)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
