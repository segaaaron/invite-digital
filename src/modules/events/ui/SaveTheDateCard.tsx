'use client'

import { useActionState } from 'react'
import { crearSaveTheDateAction, quitarSaveTheDateAction, type SaveTheDateState } from '@/app/_acciones/events/save-the-date-actions'
import { CopyLinkButton } from '@/shared/design/ui/CopyLinkButton'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'

const INICIAL: SaveTheDateState = { status: 'idle', message: '' }

/**
 * El «save the date»: un enlace para mandar antes de la invitación, con la portada del diseño, los
 * nombres, la fecha y «Agregar a mi calendario». Sin el extra, la tarjeta dice dónde pedirlo.
 */
export function SaveTheDateCard({ eventId, eventSlug, url, disponible, extras }: { eventId: string; eventSlug: string; url: string | null; disponible: boolean; extras: string }) {
  const t = useT()
  const [creado, crear] = useActionState(sinCaerse(crearSaveTheDateAction), INICIAL)
  const [quitado, quitar] = useActionState(sinCaerse(quitarSaveTheDateAction), INICIAL)
  // Lo vigente lo dice el servidor (la acción revalida): con el estado local, «Quitar» seguía enseñando el enlace.
  const vigente = url

  if (!disponible && vigente === null) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-[13px] text-ink-soft">{t('Un adelanto para mandar meses antes: la portada de tu diseño, sus nombres, la fecha y «Agregar a mi calendario».', 'A teaser to send months ahead: your design’s cover, the names, the date and “Add to my calendar”.')}</p>
        <PanelButton href={extras}>{t('Pedirlo en Extras', 'Request it in Extras')}</PanelButton>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-ink-soft">{t('Mándalo antes que la invitación: la portada de tu diseño, sus nombres, la fecha y «Agregar a mi calendario». Usa los nombres y la fecha que escribes aquí.', 'Send it before the invitation: your design’s cover, the names, the date and “Add to my calendar”. It uses the names and date you write here.')}</p>
      {vigente === null ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <code className="max-w-full truncate rounded-[10px] border border-line-panel bg-white px-3 py-2 text-[12px] text-ink">{vigente}</code>
          <CopyLinkButton label={t('Enlace del save the date', 'Save the date link')} url={vigente} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <form action={crear}>
          <input name="eventId" type="hidden" value={eventId} />
          <input name="eventSlug" type="hidden" value={eventSlug} />
          <SubmitButton variant={vigente === null ? 'primary' : 'default'}>{vigente === null ? t('Crear el save the date', 'Create the save the date') : t('Cambiar el enlace', 'Change the link')}</SubmitButton>
        </form>
        {vigente === null ? null : (
          <form action={quitar}>
            <input name="eventId" type="hidden" value={eventId} />
            <input name="eventSlug" type="hidden" value={eventSlug} />
            <SubmitButton variant="default">{t('Quitar', 'Remove')}</SubmitButton>
          </form>
        )}
      </div>
      <ActionFeedback state={creado} />
      <ActionFeedback state={quitado} />
    </div>
  )
}
