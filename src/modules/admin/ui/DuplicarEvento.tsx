'use client'

import { useActionState } from 'react'
import { duplicarEventoAction } from '@/app/_acciones/admin/bodas-actions'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { botonClases } from '@/shared/design/ui/panel/PanelKit'
import { useT } from '@/shared/i18n/idioma-navegador'

/** Mismo diseño, plan y fecha, sin invitados. Al acertar, la acción lleva a la copia; si falla, lo dice aquí. */
export function DuplicarEvento({ eventId }: { eventId: string }) {
  const t = useT()
  const [estado, duplicar, pendiente] = useActionState(sinCaerse(duplicarEventoAction), { status: 'idle' })
  return (
    // En su tarjeta, como las demás de la ficha (16 oct: era un enlace suelto entre dos tarjetas).
    <form action={duplicar} className="flex flex-col gap-3 rounded-[16px] border border-line-panel bg-tarjeta p-6 max-[767px]:p-5">
      <input name="eventId" type="hidden" value={eventId} />
      <p className="text-[14px] text-ink-mute">{t('Otro evento con el mismo diseño, plan y fecha, sin invitados: la civil y la religiosa, o la familia que vuelve.', 'Another event with the same design, plan and date, without guests: the civil and the religious ceremony, or a returning family.')}</p>
      <button aria-busy={pendiente} className={botonClases('default')} disabled={pendiente} type="submit">
        {pendiente ? t('Duplicando…', 'Duplicating…') : t('Duplicar el evento', 'Duplicate the event')}
      </button>
      {estado.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {estado.message}
        </p>
      ) : null}
    </form>
  )
}
