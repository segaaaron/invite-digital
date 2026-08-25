'use client'

import { useState, useTransition } from 'react'
import { removeZoneAction, updateZoneAction } from '../actions'
import type { VenueZone, ZoneKind } from '../domain/venue-zone'

type Props = { eventId: string; eventSlug: string; zones: readonly VenueZone[] }

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

const CAMPO =
  'min-w-0 flex-1 rounded-pill border border-line bg-bg-top px-3 py-2 text-[13px] text-ink'
const PILDORA =
  'rounded-pill border border-line px-4 py-2 font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink disabled:opacity-40'

/**
 * Las zonas del salón: la pista, la barra, el escenario. El plano ya sabía dibujarlas y
 * moverlas, pero no había ninguna pantalla para crearlas, así que ningún salón podía
 * tener ninguna. Esto es esa pantalla.
 *
 * Renombrar manda también el sitio y el tamaño, porque el caso de uso rehace la zona
 * entera: sin ellos, corregir un nombre la devolvería al centro del plano.
 */
export function ZoneControls({ eventId, eventSlug, zones }: Props) {
  const [etiquetas, setEtiquetas] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const correr = (accion: () => Promise<{ ok: boolean; message?: string }>, alAcabar?: () => void) => {
    setError(null)
    empezar(async () => {
      const r = await accion()
      if (r.ok) alAcabar?.()
      else setError(r.message ?? 'No se pudo completar la operación.')
    })
  }

  return (
    <section className="flex flex-col gap-5">
      <h2 className="font-mono text-[9px] tracking-[0.3em] text-ink-mute uppercase">Elementos del salón</h2>

      {zones.length === 0 ? (
        <p className="text-[13px] text-ink-mute">
          Todavía no hay elementos. Añádelos con «+ Elemento del salón» y colócalos arrastrándolos en el plano.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {zones.map((zone) => {
            const texto = etiquetas[zone.id] ?? zone.label

            return (
              <li key={zone.id} className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
                  {NOMBRE_CLASE[zone.kind]}
                </span>
                <label className="sr-only" htmlFor={`zona-${zone.id}`}>
                  Etiqueta de {zone.label}
                </label>
                <input
                  className={CAMPO}
                  id={`zona-${zone.id}`}
                  maxLength={60}
                  onChange={(e) => setEtiquetas((previas) => ({ ...previas, [zone.id]: e.target.value }))}
                  type="text"
                  value={texto}
                />
                <button
                  className={PILDORA}
                  disabled={pendiente}
                  onClick={() =>
                    correr(() =>
                      updateZoneAction({
                        id: zone.id,
                        eventId,
                        eventSlug,
                        kind: zone.kind,
                        label: texto.trim(),
                        x: zone.x,
                        y: zone.y,
                        w: zone.w,
                        h: zone.h,
                      }),
                    )
                  }
                  type="button"
                >
                  Guardar {zone.label}
                </button>
                <button
                  className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute disabled:opacity-40"
                  disabled={pendiente}
                  onClick={() => correr(() => removeZoneAction({ id: zone.id, eventId, eventSlug }))}
                  type="button"
                >
                  Eliminar {zone.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {error === null ? null : (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
