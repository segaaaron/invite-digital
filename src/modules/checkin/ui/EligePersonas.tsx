'use client'

import { useState } from 'react'
import { hora } from '@/shared/format/fecha'
import type { DoorManifestGroup } from '../application/get-door-manifest'

/**
 * Quién entra ahora, de una invitación con varias personas por llegar.
 *
 * La pareja o la familia llega partida: se marca a quien tienes delante. Los que faltan vienen
 * marcados —lo normal es que lleguen juntos— y se desmarca a quien no vino todavía. Quien ya
 * entró se ve con su hora y no se puede volver a marcar.
 */
export function EligePersonas({
  group,
  dentro,
  onRegistrar,
  onCancelar,
}: {
  group: DoorManifestGroup
  dentro: Readonly<Record<string, Date>>
  onRegistrar: (personIds: string[]) => void
  onCancelar: () => void
}) {
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(
    () => new Set(group.people.filter((p) => dentro[p.id] === undefined).map((p) => p.id)),
  )

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-30 rounded-t-3xl bg-bg-top p-6 text-ink shadow-float motion-safe:animate-slide-up md:bottom-5 md:mx-auto md:w-[min(560px,92vw)] md:rounded-3xl"
      role="dialog"
      aria-label="Quién entra ahora"
    >
      <p className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">¿Quién entra ahora?</p>
      <p className="mt-1.5 font-display text-[28px] leading-tight italic">{group.leadName ?? group.label}</p>
      <p className="mt-1 text-[13px] text-ink-soft">{group.tableLabel ?? 'Mesa por asignar'}</p>

      <ul className="mt-4 flex flex-col gap-2">
        {group.people.map((persona) => {
          const entro = dentro[persona.id]
          return (
            <li key={persona.id}>
              {entro === undefined ? (
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line-panel bg-white px-4 py-3.5 text-[15px]">
                  <input
                    checked={marcadas.has(persona.id)}
                    className="size-5 accent-[var(--color-ok)]"
                    onChange={(e) =>
                      setMarcadas((previas) => {
                        const nuevas = new Set(previas)
                        if (e.target.checked) nuevas.add(persona.id)
                        else nuevas.delete(persona.id)
                        return nuevas
                      })
                    }
                    type="checkbox"
                  />
                  {persona.fullName}
                </label>
              ) : (
                <p className="flex items-center justify-between gap-3 rounded-2xl bg-ok/10 px-4 py-3.5 text-[15px]">
                  <span>{persona.fullName}</span>
                  <span className="font-mono text-[11px] text-ok">Entró · {hora(entro)}</span>
                </p>
              )}
            </li>
          )
        })}
      </ul>

      <div className="mt-5 flex gap-2.5">
        <button
          className="flex-1 rounded-full border border-line-panel-strong px-4 py-3.5 font-mono text-[10px] tracking-[var(--tracking-luxe)] uppercase"
          onClick={onCancelar}
          type="button"
        >
          Cancelar
        </button>
        <button
          className="flex-[2] rounded-full bg-ok px-4 py-3.5 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-white uppercase disabled:opacity-40"
          disabled={marcadas.size === 0}
          onClick={() => onRegistrar([...marcadas])}
          type="button"
        >
          {`Registrar entrada (${marcadas.size})`}
        </button>
      </div>
    </div>
  )
}
