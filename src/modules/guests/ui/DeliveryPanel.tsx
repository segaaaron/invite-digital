'use client'

import { useActionState, useState } from 'react'
import { resendInvitationAction, setGroupPhoneAction, type ResendState } from '../actions'
import { renderMessage, whatsappLink } from '../domain/message-template'

export type DeliveryRow = {
  readonly id: string
  readonly label: string
  readonly phone: string | null
  readonly sent: boolean
  readonly revoked: boolean
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
  eventLocale,
  template,
  rows,
}: {
  eventSlug: string
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
      <p className="text-[12px] leading-[1.7] text-gold-deep">
        Y su pase de la puerta deja de valer: el QR guardado en el teléfono del invitado apunta al enlace viejo. Si el
        evento ya empezó, avísale antes de reenviar.
      </p>

      {state.status === 'error' || error !== null ? (
        <p className="text-[13px] text-gold-deep" role="alert">
          {state.status === 'error' ? state.message : error}
        </p>
      ) : null}

      {state.status === 'success' ? (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-gold/50 bg-gold/10 p-4" role="status">
          <p className="text-[13px] text-ink">
            Enlace nuevo de <strong className="font-normal">{state.label}</strong>. Cópialo ahora: no volverá a
            mostrarse.
          </p>
          <input
            aria-label="Enlace de la invitación"
            className="w-full rounded-[12px] border border-line bg-bg-top px-3 py-2 font-mono text-[12px] text-ink"
            readOnly
            value={state.url}
          />
          <div className="flex flex-wrap gap-2.5">
            <button
              className="rounded-full border border-line px-3.5 py-1.5 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink uppercase"
              onClick={() => void navigator.clipboard?.writeText(state.url)}
              type="button"
            >
              Copiar
            </button>
            <a
              className="cursor-pointer rounded-[var(--radius-pill)] border border-shell-deep bg-linear-to-b from-shell to-shell-deep px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-white uppercase transition-all duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
              href={whatsappLink({
                // Por `groupId`, nunca por etiqueta: dos grupos pueden llamarse igual, y
                // el enlace saldría con el teléfono del otro.
                phone: telefonos[state.groupId] ?? null,
                message: mensaje(state.label, state.url),
              })}
              rel="noopener noreferrer"
              target="_blank"
            >
              Enviar por WhatsApp
            </a>
          </div>
        </div>
      ) : null}

      <ul className="flex flex-col gap-2.5">
        {rows.map((fila) => (
          <li
            key={fila.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-bg-top/60 p-3.5"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] text-ink">{fila.label}</span>
              <span className="mt-0.5 block font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
                {fila.revoked ? 'Revocada' : fila.sent ? 'Enviada' : 'Sin enviar'}
              </span>
            </span>

            <label className="flex items-center gap-2">
              <span className="sr-only">Teléfono de {fila.label}</span>
              <input
                className="w-[170px] rounded-full border border-line bg-bg-top px-3 py-1.5 text-[12px] text-ink"
                onBlur={() => {
                  setError(null)
                  // Un fallo mudo aquí deja el número en pantalla y no en la base: al
                  // reenviar, WhatsApp abriría sin destinatario.
                  void setGroupPhoneAction({ eventSlug, id: fila.id, phone: telefonos[fila.id] ?? '' }).then(
                    (estado) => {
                      if (estado.status === 'error') setError(estado.message)
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
              <button
                className="rounded-full border border-line px-3.5 py-1.5 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink uppercase disabled:opacity-40"
                disabled={pending || fila.revoked}
                title={fila.revoked ? 'Reactiva la invitación antes de repartirla' : 'Genera un enlace nuevo'}
                type="submit"
              >
                {fila.sent ? 'Reenviar' : 'Generar enlace'}
              </button>
            </form>

            <button
              className="rounded-full border border-line px-3.5 py-1.5 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase"
              onClick={() => {
                void navigator.clipboard?.writeText(mensaje(fila.label, '{enlace}'))
                setCopiado(fila.id)
              }}
              title="Copia el mensaje del evento para pegarlo donde quieras"
              type="button"
            >
              {copiado === fila.id ? 'Copiado' : 'Copiar mensaje'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
