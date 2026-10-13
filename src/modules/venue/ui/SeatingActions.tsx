'use client'

import { useState, useTransition } from 'react'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { PlusIcon } from '@/shared/design/ui/icons'
import { autoAssignAction } from '@/app/_acciones/venue/actions'

/**
 * Las acciones de cabecera de la maqueta (E10): sentar a los demás solo, añadir mesa y guardar el plano.
 *
 * Vivían dentro del panel de reparto, a media página de scroll. Auto-asignar necesita
 * cliente —dice en pantalla cuántos repartió y quién se quedó sin sitio—, así que la
 * cabecera entera es un componente de cliente y el enlace de imprimir viaja con ella.
 */
export function SeatingActions({
  eventId,
  eventSlug,
  unseatedCount,
  addHref,
  guardar,
}: {
  eventId: string
  eventSlug: string
  unseatedCount: number
  /** Adónde lleva «+ Añadir mesa»: abre el alta, que no vive desplegada en la página. */
  addHref: string
  /** «Guardar el plano»: solo en la vista de mapa. */
  guardar?: React.ReactNode
}) {
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2.5">
        {unseatedCount === 0 ? null : (
          <PanelButton
            disabled={pendiente}
            onClick={() => {
              setError(null)
              setMensaje(null)
              empezar(async () => {
                const r = await autoAssignAction({ eventId, eventSlug })
                if (!r.ok) {
                  setError(r.message ?? 'No se pudo repartir.')
                  return
                }
                setMensaje(r.message ?? null)
              })
            }}
          >
            Sentar a los demás solo
          </PanelButton>
        )}
        <PanelButton href={addHref} variant={guardar ? 'default' : 'primary'}>
          <PlusIcon className="size-4" /> Mesa
        </PanelButton>
        {guardar}
      </div>

      {error !== null ? (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-[12px] text-ink-soft" role="status">
          {mensaje ?? ''}
        </p>
      )}
    </div>
  )
}
