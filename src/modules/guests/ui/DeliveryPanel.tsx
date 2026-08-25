'use client'

import { useActionState, useState } from 'react'
import { PanelButton, Pill, type PillTone } from '@/shared/design/ui/panel/PanelKit'
import { resendInvitationAction, setGroupPhoneAction, type ResendState } from '../actions'
import { DeliverySheet } from './DeliverySheet'
import { renderMessage, whatsappLink } from '../domain/message-template'

export type DeliveryRow = {
  readonly id: string
  readonly label: string
  readonly phone: string | null
  readonly sent: boolean
  readonly revoked: boolean
}

function estado(fila: DeliveryRow): { tone: PillTone; text: string } {
  if (fila.revoked) return { tone: 'no', text: 'Revocada' }
  if (fila.sent) return { tone: 'ok', text: 'Enviada' }
  return { tone: 'pending', text: 'Sin enviar' }
}

/**
 * El reparto de invitaciones.
 *
 * **Reenviar rota el enlace**: el anterior deja de abrir nada. Se avisa antes de pulsar,
 * no después, porque quien lo tenía —el propio invitado— se queda fuera si ya lo había
 * recibido.
 *
 * El enlace nuevo se enseña **una sola vez**, aquí mismo: en la base solo queda su hash.
 */
export function DeliveryPanel({
  eventSlug,
  eventTitle,
  eventLocale,
  template,
  rows,
}: {
  eventSlug: string
  eventTitle: string
  eventLocale: string
  template: string | null
  rows: readonly DeliveryRow[]
}) {
  const [state, action, pending] = useActionState<ResendState, FormData>(resendInvitationAction, { status: 'idle' })
  const [telefonos, setTelefonos] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((fila) => [fila.id, fila.phone ?? ''])),
  )
  const [copiado, setCopiado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mensaje = (label: string, url: string) =>
    renderMessage({ template, locale: eventLocale, groupLabel: label, url })

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[12px] leading-[1.7] text-ink-soft">
        Al reenviar se genera un enlace nuevo y el anterior deja de funcionar, también para quien ya lo tuviera. El
        enlace nuevo se enseña una sola vez.
      </p>
      <p className="text-[12px] leading-[1.7] text-danger">
        Y su pase de la puerta deja de valer: el QR guardado en el teléfono del invitado apunta al enlace viejo. Si el
        evento ya empezó, avísale antes de reenviar.
      </p>

      {state.status === 'error' || error !== null ? (
        <p className="text-[13px] text-danger" role="alert">
          {state.status === 'error' ? state.message : error}
        </p>
      ) : null}

      {state.status === 'success' ? (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-line-panel-strong bg-bg-raised p-4" role="status">
          <p className="text-[13px] text-ink">
            Enlace nuevo de <strong className="font-normal">{state.label}</strong>. Cópialo ahora: no volverá a
            mostrarse.
          </p>
          <input
            aria-label="Enlace de la invitación"
            className="w-full rounded-[12px] border border-line-panel-strong bg-white px-3 py-2 font-mono text-[12px] text-ink"
            readOnly
            value={state.url}
          />
          <div className="flex flex-wrap gap-2.5">
            <PanelButton onClick={() => void navigator.clipboard?.writeText(state.url)}>Copiar</PanelButton>
            <PanelButton
              external
              href={whatsappLink({
                // Por `groupId`, nunca por etiqueta: dos grupos pueden llamarse igual, y
                // el enlace saldría con el teléfono del otro.
                phone: telefonos[state.groupId] ?? null,
                message: mensaje(state.label, state.url),
              })}
              variant="primary"
            >
              Enviar por WhatsApp
            </PanelButton>
          </div>

          {/* La tarjeta con el QR solo puede existir aquí y ahora: el enlace en claro se
              va con esta pantalla. */}
          <DeliverySheet cards={[{ label: state.label, url: state.url }]} eventTitle={eventTitle} />
        </div>
      ) : null}

      <ul className="flex flex-col gap-2.5">
        {rows.map((fila) => (
          <li
            key={fila.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-line-panel bg-white p-3.5"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] text-ink">{fila.label}</span>
              <span className="mt-1 block">
                <Pill tone={estado(fila).tone}>{estado(fila).text}</Pill>
              </span>
            </span>

            <label className="flex items-center gap-2">
              <span className="sr-only">Teléfono de {fila.label}</span>
              <input
                className="w-[170px] rounded-[var(--radius-pill)] border border-line-panel-strong bg-bg-raised px-3 py-1.5 text-[12px] text-ink"
                onBlur={() => {
                  setError(null)
                  // Un fallo mudo aquí deja el número en pantalla y no en la base: al
                  // reenviar, WhatsApp abriría sin destinatario.
                  void setGroupPhoneAction({ eventSlug, id: fila.id, phone: telefonos[fila.id] ?? '' }).then(
                    (resultado) => {
                      if (resultado.status === 'error') setError(resultado.message)
                    },
                  )
                }}
                onChange={(e) => setTelefonos((previo) => ({ ...previo, [fila.id]: e.target.value }))}
                placeholder="+591 700 11122"
                value={telefonos[fila.id] ?? ''}
              />
            </label>

            <form action={action}>
              <input name="eventSlug" type="hidden" value={eventSlug} />
              <input name="groupId" type="hidden" value={fila.id} />
              <PanelButton
                disabled={pending || fila.revoked}
                title={fila.revoked ? 'Reactiva la invitación antes de repartirla' : 'Genera un enlace nuevo'}
                type="submit"
              >
                {fila.sent ? 'Reenviar' : 'Generar enlace'}
              </PanelButton>
            </form>

            <PanelButton
              onClick={() => {
                void navigator.clipboard?.writeText(mensaje(fila.label, '{enlace}'))
                setCopiado(fila.id)
              }}
              title="Copia el mensaje del evento para pegarlo donde quieras"
            >
              {copiado === fila.id ? 'Copiado' : 'Copiar mensaje'}
            </PanelButton>
          </li>
        ))}
      </ul>
    </div>
  )
}
