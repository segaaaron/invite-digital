'use client'

import { useActionState, useId, useState } from 'react'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { type ContentActionState, saveContentBlockAction } from '../actions'
import type { InvitationContent, SectionKey } from '../domain/invitation-content'

const INICIAL: ContentActionState = { status: 'idle' }

const CAMPO =
  'w-full rounded-[10px] border border-[var(--color-line-panel)] bg-bg-top px-3 py-2 text-[13px] text-ink outline-none transition-colors focus-visible:border-ink'

const ROTULO = 'flex flex-col gap-1.5 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute'

/** Cómo se llama cada bloque en la pantalla, y qué se le pide. */
const TITULOS: Record<SectionKey, string> = {
  hero: 'Portada y nombres',
  quote: 'Frase',
  hosts: 'Padres y padrinos',
  schedule: 'Fecha y hora exactas',
  ceremony: 'Ceremonia',
  reception: 'Recepción',
  map: 'Mapa',
  itinerary: 'Itinerario',
  dressCode: 'Código de vestimenta',
  music: 'Canción',
  gallery: 'Galería',
  notes: 'Avisos',
  closing: 'Despedida',
}

const ERRORES: Record<string, string> = {
  unknown_section: 'Esa sección no existe en este diseño.',
  invalid_payload: 'No se pudo leer lo que enviaste. Vuelve a intentarlo.',
  storage_failure: 'No se pudo guardar. La base no respondió.',
}

type Props = {
  readonly eventId: string
  readonly eventSlug: string
  /** Las secciones que **este** diseño pinta. Las demás no se enseñan. */
  readonly sections: readonly SectionKey[]
  readonly content: InvitationContent
}

/**
 * El contenido de la invitación, un formulario por bloque.
 *
 * **Solo se enseñan las secciones que el diseño elegido pinta.** Pedirle un itinerario a
 * un diseño que no lo tiene es pedir trabajo que no se ve, y llenar la pantalla de
 * formularios que no sirven es la forma más rápida de que el atelier deje de rellenarla.
 *
 * Cada bloque se guarda por separado porque es la unidad de sentido: cambiar la canción no
 * puede exigir volver a enviar el itinerario.
 *
 * El valor viaja como JSON en un campo oculto. No es pereza: el itinerario, la galería y
 * los anfitriones son listas de longitud variable, y componerlas desde campos planos con
 * índices en el nombre es exactamente donde se pierden filas al reordenar. Quien decide
 * qué es válido sigue siendo el dominio, en el servidor.
 */
export function ContentBlockForms({ eventId, eventSlug, sections, content }: Props) {
  if (sections.length === 0) {
    return (
      <p className="text-[13px] leading-[1.7] text-ink-soft">
        El diseño elegido no lleva contenido editable: se compone con el título, la fecha y el lugar del evento.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {sections.map((seccion) => (
        <BloqueDeContenido
          content={content}
          eventId={eventId}
          eventSlug={eventSlug}
          key={seccion}
          section={seccion}
        />
      ))}
    </div>
  )
}

function BloqueDeContenido({
  eventId,
  eventSlug,
  section,
  content,
}: {
  eventId: string
  eventSlug: string
  section: SectionKey
  content: InvitationContent
}) {
  const [state, formAction, isPending] = useActionState(saveContentBlockAction, INICIAL)
  const [valor, setValor] = useState(() => JSON.stringify(content[section] ?? null, null, 2))
  const campoId = useId()

  const error = state.status === 'error' ? (ERRORES[state.message] ?? ERRORES.storage_failure) : null

  return (
    <form action={formAction} className="flex flex-col gap-2.5 border-t border-[var(--color-line-panel)] pt-4">
      <input name="eventId" readOnly type="hidden" value={eventId} />
      <input name="eventSlug" readOnly type="hidden" value={eventSlug} />
      <input name="section" readOnly type="hidden" value={section} />

      <label className={ROTULO} htmlFor={campoId}>
        {TITULOS[section]}
        <textarea
          className={`${CAMPO} font-mono text-[12px] leading-[1.6]`}
          id={campoId}
          name="value"
          onChange={(evento) => setValor(evento.target.value)}
          rows={valor.split('\n').length > 12 ? 12 : Math.max(3, valor.split('\n').length)}
          value={valor}
        />
      </label>

      {error === null ? null : (
        <p className="text-[12px] text-gold-deep" role="alert">
          {error}
        </p>
      )}
      {state.status === 'success' ? (
        <p aria-live="polite" className="text-[12px] text-ink-soft" role="status">
          Guardado.
        </p>
      ) : null}

      <div>
        <PanelButton disabled={isPending} type="submit" variant="default">
          {isPending ? 'Guardando…' : 'Guardar'}
        </PanelButton>
      </div>
    </form>
  )
}
