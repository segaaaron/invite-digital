'use client'

import { useActionState, useId } from 'react'
import { guardarPreguntasAction, type PreguntasState } from '@/app/_acciones/rsvp/preguntas-actions'
import { FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import type { PreguntasDelRsvp } from '../domain/preguntas'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * Qué se pregunta al confirmar, además de si viene: la canción que no puede faltar, el menú y a
 * qué actos va (civil, iglesia, fiesta). Vacío, el formulario de siempre.
 */
export function PreguntasAlConfirmar({ eventId, eventSlug, preguntas }: { eventId: string; eventSlug: string; preguntas: PreguntasDelRsvp }) {
  const t = useT()
  const [estado, accion] = useActionState<PreguntasState, FormData>(sinCaerse(guardarPreguntasAction), { status: 'idle', message: '' })
  const id = useId()
  return (
    <form action={accion} className="flex flex-col gap-4">
      <input name="eventId" type="hidden" value={eventId} />
      <input name="eventSlug" type="hidden" value={eventSlug} />
      <label className="flex items-center gap-2.5 text-[13.5px] text-ink max-[859px]:min-h-11">
        <input className="accent-ink max-[859px]:size-5" defaultChecked={preguntas.cancion} name="cancion" type="checkbox" />
        {t('Pedir una canción que no puede faltar', 'Ask for a must-play song')}
      </label>
      <div className="grid gap-4 min-[700px]:grid-cols-2">
        <label className="flex flex-col gap-2" htmlFor={`${id}-menus`}>
          <span className={LABEL_CLASS}>{t('Menús para elegir · uno por línea', 'Menus to choose · one per line')}</span>
          <textarea className={`${FIELD_CLASS} min-h-[96px]`} defaultValue={preguntas.menus.join('\n')} id={`${id}-menus`} name="menus" placeholder={t('Carne\nPollo\nVegetariano', 'Beef\nChicken\nVegetarian')} />
        </label>
        <label className="flex flex-col gap-2" htmlFor={`${id}-actos`}>
          <span className={LABEL_CLASS}>{t('Actos · uno por línea', 'Ceremonies · one per line')}</span>
          <textarea className={`${FIELD_CLASS} min-h-[96px]`} defaultValue={preguntas.actos.join('\n')} id={`${id}-actos`} name="actos" placeholder={t('Civil\nIglesia\nFiesta', 'Civil\nChurch\nParty')} />
        </label>
      </div>
      <p className="text-[12px] text-ink-mute">{t('Hasta 6 menús y 4 actos. Los actos no cambian el recuento para las mesas y la puerta: ese es el de la fiesta.', 'Up to 6 menus and 4 ceremonies. Ceremonies do not change the count for tables and the door: that one is the party’s.')}</p>
      <ActionFeedback state={estado} />
      <div>
        <SubmitButton>{t('Guardar preguntas', 'Save questions')}</SubmitButton>
      </div>
    </form>
  )
}
