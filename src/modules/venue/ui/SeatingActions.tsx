'use client'

import { useState, useTransition } from 'react'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { autoAssignAction } from '../actions'

/**
 * Las acciones de cabecera de la maqueta: auto-asignar, imprimir el plan y añadir mesa.
 *
 * Vivían dentro del panel de reparto, a media página de scroll. Auto-asignar necesita
 * cliente —dice en pantalla cuántos repartió y quién se quedó sin sitio—, así que la
 * cabecera entera es un componente de cliente y el enlace de imprimir viaja con ella.
 */
export function SeatingActions({
  eventId,
  eventSlug,
  unseatedCount,
}: {
  eventId: string
  eventSlug: string
  unseatedCount: number
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
            + Auto-asignar
          </PanelButton>
        )}
        <PanelButton href={`/panel/eventos/${eventSlug}/mesas/imprimir`}>Imprimir plan ↓</PanelButton>
        <PanelButton href="#anadir-mesa" variant="primary">
          + Añadir mesa
        </PanelButton>
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
