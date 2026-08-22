'use client'

import { useState, useTransition } from 'react'
import { addZoneAction, removeZoneAction, updateZoneAction } from '../actions'
import { ZONE_KINDS, type VenueZone, type ZoneKind } from '../domain/venue-zone'

type Props = { eventId: string; eventSlug: string; zones: readonly VenueZone[] }

const NOMBRE_CLASE: Record<ZoneKind, string> = {
  dance: 'Pista de baile',
  bar: 'Barra',
  stage: 'Escenario',
  music: 'Música',
  entrance: 'Entrada',
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
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState<ZoneKind>('dance')
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

  const anadir = () => {
    if (label.trim().length === 0) {
      setError('La zona necesita una etiqueta para reconocerla en el plano.')
      return
    }

    correr(() => addZoneAction({ eventId, eventSlug, kind, label: label.trim() }), () => setLabel(''))
  }

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Zonas del salón</h2>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
          Nueva zona
          <input
            className={CAMPO}
            maxLength={60}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Pista de baile"
            type="text"
            value={label}
          />
        </label>

        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
          Clase de zona
          <select className={CAMPO} onChange={(e) => setKind(e.target.value as ZoneKind)} value={kind}>
            {ZONE_KINDS.map((k) => (
              <option key={k} value={k}>
                {NOMBRE_CLASE[k]}
              </option>
            ))}
          </select>
        </label>

        <button className={PILDORA} disabled={pendiente} onClick={anadir} type="button">
          Añadir zona
        </button>
      </div>

      {zones.length === 0 ? (
        <p className="text-[13px] text-ink-mute">
          Todavía no hay zonas. Añade la pista o la barra y colócalas arrastrándolas en el plano.
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
