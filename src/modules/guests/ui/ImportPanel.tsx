'use client'

import { useActionState } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
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
          <span className={LABEL_CLASS}>Pega el listado en CSV</span>
          <textarea
            className={`${FIELD_CLASS} min-h-[120px] font-mono text-[12px]`}
            name="csv"
            placeholder={'Familia Rojas Peña;4;+59170011122\nAna Lucía Vega;2;'}
            title="Una fila por grupo: etiqueta, número de cupos y teléfono opcional"
            required
          />
        </label>

        <PanelButton className="w-fit" disabled={pending} type="submit" variant="primary">
          {pending ? 'Importando…' : 'Importar invitados'}
        </PanelButton>
      </form>

      {state.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === 'success' ? (
        <div className="flex flex-col gap-3" role="status">
          <p className="text-[13px] text-ink">
            {state.created} creadas · {state.rejected} rechazadas. Los enlaces solo se muestran aquí: cópialos ahora.
          </p>
          {/* `relative` a propósito: sin él, un absoluto de dentro toma como bloque
              contenedor el `main` y no se recorta, y estira el documento en el teléfono. */}
          <div className="relative overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {['Línea', 'Grupo', 'Cupos', 'Resultado'].map((titulo) => (
                    <th
                      key={titulo}
                      className="border-b border-line-panel py-3 pr-3 font-mono text-[9px] font-medium tracking-[0.3em] text-ink-mute uppercase"
                    >
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.rows.map((fila) => (
                  <tr key={fila.line}>
                    <td className="border-b border-line-panel py-3 pr-3 font-mono text-[12px] text-ink-mute">
                      {fila.line}
                    </td>
                    <td className="border-b border-line-panel py-3 pr-3 text-[13px] text-ink">{fila.label || '—'}</td>
                    <td className="border-b border-line-panel py-3 pr-3 font-mono text-[12px] text-ink-soft">
                      {fila.seats}
                    </td>
                    <td className="border-b border-line-panel py-3 text-[12px]">
                      {fila.url === null ? (
                        <span className="text-danger">{fila.problem}</span>
                      ) : (
                        <input
                          aria-label={`Enlace de ${fila.label}`}
                          className="w-full min-w-[240px] rounded-[10px] border border-line-panel-strong bg-white px-2 py-1 font-mono text-[11px] text-ink"
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
