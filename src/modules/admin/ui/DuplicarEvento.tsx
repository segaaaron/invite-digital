'use client'

import { useActionState } from 'react'
import { duplicarEventoAction } from '@/app/_acciones/admin/bodas-actions'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

/** Mismo diseño, plan y fecha, sin invitados. Al acertar, la acción lleva a la copia; si falla, lo dice aquí. */
export function DuplicarEvento({ eventId }: { eventId: string }) {
  const [estado, duplicar, pendiente] = useActionState(sinCaerse(duplicarEventoAction), { status: 'idle' })
  return (
    <form action={duplicar} className="ml-auto flex flex-col items-end">
      <input name="eventId" type="hidden" value={eventId} />
      <button aria-busy={pendiente} className="h-full px-2 text-[12.5px] text-ink-soft underline underline-offset-4 hover:text-ink disabled:opacity-60" disabled={pendiente} type="submit">
        {pendiente ? 'Duplicando…' : 'Duplicar el evento'}
      </button>
      {estado.status === 'error' ? (
        <p className="px-2 text-[12px] text-danger" role="alert">
          {estado.message}
        </p>
      ) : null}
    </form>
  )
}
