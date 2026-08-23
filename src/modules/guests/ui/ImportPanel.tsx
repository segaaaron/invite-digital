'use client'

import { useActionState } from 'react'
import { importGuestsAction, type ImportState } from '../actions'

/**
 * Importación masiva desde un CSV.
 *
 * El resultado se enseña **fila por fila**, con su enlace o su motivo de rechazo. Un «se
 * importaron 37 de 50» obliga a comparar dos listas a mano para saber quién falta, y esos
 * enlaces no se pueden volver a mostrar.
 */
export function ImportPanel({ eventId, eventSlug }: { eventId: string; eventSlug: string }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importGuestsAction, { status: 'idle' })

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-3">
        <input name="eventId" type="hidden" value={eventId} />
        <input name="eventSlug" type="hidden" value={eventSlug} />

        <label className="flex flex-col gap-2">
          <span className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
            Pega el listado en CSV
          </span>
          <textarea
            className="min-h-[120px] rounded-[14px] border border-line bg-bg-top/80 px-4 py-3 font-mono text-[12px] text-ink"
            name="csv"
            placeholder={'Familia Rojas Peña;4;+59170011122\nAna Lucía Vega;2;'}
            title="Una fila por grupo: etiqueta, número de cupos y teléfono opcional"
            required
          />
        </label>

        <button
          className="w-fit rounded-full border border-line px-4 py-2 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink uppercase disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? 'Importando…' : 'Importar invitados'}
        </button>
      </form>

      {state.status === 'error' ? (
        <p className="text-[13px] text-gold-deep" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === 'success' ? (
        <div className="flex flex-col gap-3" role="status">
          <p className="text-[13px] text-ink">
            {state.created} creadas · {state.rejected} rechazadas. Los enlaces solo se muestran aquí: cópialos ahora.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
                  <th className="border-b border-line py-2 pr-3 font-normal">Línea</th>
                  <th className="border-b border-line py-2 pr-3 font-normal">Grupo</th>
                  <th className="border-b border-line py-2 pr-3 font-normal">Cupos</th>
                  <th className="border-b border-line py-2 font-normal">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {state.rows.map((fila) => (
                  <tr key={fila.line}>
                    <td className="border-b border-line py-2 pr-3 font-mono text-[12px] text-ink-mute">{fila.line}</td>
                    <td className="border-b border-line py-2 pr-3 text-[13px] text-ink">{fila.label || '—'}</td>
                    <td className="border-b border-line py-2 pr-3 font-mono text-[12px] text-ink-soft">{fila.seats}</td>
                    <td className="border-b border-line py-2 text-[12px]">
                      {fila.url === null ? (
                        <span className="text-gold-deep">{fila.problem}</span>
                      ) : (
                        <input
                          aria-label={`Enlace de ${fila.label}`}
                          className="w-full min-w-[240px] rounded-[10px] border border-line bg-bg-top px-2 py-1 font-mono text-[11px] text-ink"
                          readOnly
                          value={fila.url}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
