'use client'

import { useActionState } from 'react'
import { FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { importGuestsAction, type ImportState } from '@/app/_acciones/guests/actions'
import { DeliverySheet } from './DeliverySheet'
import { SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * Importación masiva: se pega la lista. Copiada de Excel o Google Sheets llega separada por
 * tabuladores, y el lector la entiende igual que un CSV (`parseGuestCsv`); la fila de títulos se salta.
 *
 * El resultado se enseña **fila por fila**, con su enlace o su motivo de rechazo. Un «se
 * importaron 37 de 50» obliga a comparar dos listas a mano para saber quién falta, y esos
 * enlaces no se pueden volver a mostrar.
 */
export function ImportPanel({
  eventId,
  eventSlug,
  eventTitle,
}: {
  eventId: string
  eventSlug: string
  eventTitle: string
}) {
  const t = useT()
  const [state, action, pending] = useActionState<ImportState, FormData>(sinCaerse(importGuestsAction), { status: 'idle' })

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-3">
        <input name="eventId" type="hidden" value={eventId} />
        <input name="eventSlug" type="hidden" value={eventSlug} />

        <label className="flex flex-col gap-2">
          <span className={LABEL_CLASS}>{t('Copia las columnas de tu Excel y pégalas aquí', 'Copy the columns from your spreadsheet and paste them here')}</span>
          <textarea
            className={`${FIELD_CLASS} min-h-[120px] font-codigo text-[12px]`}
            name="csv"
            placeholder={'Familia Rojas Peña;4;+59170011122\nAna Lucía Vega;2;'}
            title={t('Una fila por invitación: nombre, número de cupos y teléfono opcional', 'One row per invitation: name, number of seats and optional phone')}
            required
          />
          <span className="text-[12px] text-ink-mute">
            {t('Tres columnas: nombre de la invitación, cupos y WhatsApp (opcional). Sirve copiar desde Excel o Google Sheets, o escribir separando con punto y coma.', 'Three columns: invitation name, seats and WhatsApp (optional). You can copy from Excel or Google Sheets, or type them separated by semicolons.')}
          </span>
        </label>

        <SubmitButton className="w-fit" variant="primary" pending={pending} pendingLabel={t('Importando…', 'Importing…')}>{t('Importar invitados', 'Import guests')}</SubmitButton>
      </form>

      {state.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === 'success' ? (
        <div className="flex flex-col gap-3" role="status">
          <p className="text-[13px] text-ink">
            {t(`${state.created} creadas · ${state.rejected} rechazadas. Los enlaces solo se muestran aquí: cópialos ahora.`, `${state.created} created · ${state.rejected} rejected. The links are only shown here: copy them now.`)}
          </p>
          {/* `relative` a propósito: sin él, un absoluto de dentro toma como bloque
              contenedor el `main` y no se recorta, y estira el documento en el teléfono. */}
          {/* En el celular, una tarjeta por fila (13 oct): la tabla se deslizaba de lado dentro del diálogo. */}
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 min-[768px]:hidden">
            {state.rows.map((fila) => (
              <li className="flex flex-col gap-2 rounded-[14px] border border-line-panel bg-white p-3.5" key={fila.line}>
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-medium text-ink">{fila.label || '—'}</span>
                  <span className="shrink-0 text-[12.5px] text-ink-mute">
                    {t(`Línea ${fila.line} · ${fila.seats} ${fila.seats === 1 ? 'cupo' : 'cupos'}`, `Line ${fila.line} · ${fila.seats} ${fila.seats === 1 ? 'seat' : 'seats'}`)}
                  </span>
                </span>
                {fila.url === null ? (
                  <span className="text-[13.5px] text-danger">{fila.problem}</span>
                ) : (
                  <input
                    aria-label={`Su enlace: ${fila.label}`}
                    className="min-h-11 w-full rounded-[10px] border border-line-panel-strong bg-white px-3 font-codigo text-[13px] text-ink"
                    readOnly
                    value={fila.url}
                  />
                )}
              </li>
            ))}
          </ul>
          <div className="relative overflow-x-auto max-[767px]:hidden">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {[t('Línea', 'Line'), t('Invitación', 'Invitation'), t('Cupos', 'Seats'), t('Resultado', 'Result')].map((titulo) => (
                    <th
                      key={titulo}
                      className="border-b border-line-panel py-3 pr-3 font-mono text-[12px] font-medium tracking-[0.16em] text-ink-mute uppercase"
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
                          aria-label={t(`Enlace de ${fila.label}`, `${fila.label}’s link`)}
                          className="w-full min-w-[240px] rounded-[10px] border border-line-panel-strong bg-white px-2 py-1 font-codigo text-[12px] text-ink"
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

          {/* Cincuenta grupos importados son cincuenta enlaces que no se vuelven a
              mostrar: la hoja los deja en papel de una vez. */}
          <DeliverySheet
            cards={state.rows.flatMap((fila) => (fila.url === null ? [] : [{ label: fila.label, url: fila.url }]))}
            eventTitle={eventTitle}
          />
        </div>
      ) : null}
    </div>
  )
}
