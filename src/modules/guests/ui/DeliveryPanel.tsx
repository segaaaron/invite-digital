'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { PanelButton, Pill, type PillTone } from '@/shared/design/ui/panel/PanelKit'
import { CampoTelefono } from '@/shared/design/ui/panel/CampoTelefono'
import { resendInvitationAction, setGroupPhoneAction, type ResendState } from '@/app/_acciones/guests/actions'
import { DeliverySheet } from './DeliverySheet'
import { renderMessage, whatsappLink } from '../domain/message-template'

export type DeliveryRow = {
  readonly id: string
  readonly label: string
  readonly phone: string | null
  readonly sent: boolean
  readonly revoked: boolean
}

/**
 * Lo que dice la píldora. «Enviada» sobraba: aquí no se envía nada solo, se prepara el enlace
 * y lo manda una persona. Decir «enviada» hacía creer que el sistema ya había escrito.
 */
function estado(fila: DeliveryRow): { tone: PillTone; text: string } {
  if (fila.revoked) return { tone: 'no', text: 'Revocada' }
  if (fila.sent) return { tone: 'ok', text: 'Enlace repartido' }
  return { tone: 'pending', text: 'Sin enlace' }
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
  borrador,
  sinContenido,
  puedePublicar,
}: {
  eventSlug: string
  eventTitle: string
  eventLocale: string
  template: string | null
  rows: readonly DeliveryRow[]
  /** El evento sigue en borrador: sus enlaces devuelven 404 a quien los abra. */
  borrador: boolean
  /** La invitación está en blanco: el enlace abriría una página sin nada escrito. */
  sinContenido: boolean
  /** Quien lo lleva lo publica desde la ficha; el cliente se lo pide a su atelier. */
  puedePublicar: boolean
}) {
  const [state, action, pending] = useActionState<ResendState, FormData>(resendInvitationAction, { status: 'idle' })
  const [telefonos, setTelefonos] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((fila) => [fila.id, fila.phone ?? ''])),
  )
  const [error, setError] = useState<string | null>(null)

  const mensaje = (label: string, url: string) =>
    renderMessage({ template, locale: eventLocale, groupLabel: label, url })

  return (
    <div className="flex flex-col gap-5">
      {/* Un enlace de un evento en borrador **no abre**: la invitación responde 404. Repartirlo
          es mandarle a una familia una página de error, así que no se genera ninguno hasta
          publicar. */}
      {sinContenido && !borrador ? (
        <div className="flex flex-col gap-2 rounded-[14px] border border-gold/50 bg-gold/10 p-4" role="alert">
          <p className="text-[13.5px] leading-[1.6] text-ink">
            <strong className="font-medium">Tu invitación está en blanco.</strong> Escríbela antes de repartir enlaces: quien abra el suyo
            vería una página sin nombres ni fecha.
          </p>
          <p className="text-[13px]">
            <Link className="text-gold-deep underline underline-offset-4" href={`/panel/eventos/${eventSlug}/configuracion`}>
              Escribir mi invitación
            </Link>
          </p>
        </div>
      ) : null}

      {borrador ? (
        <div className="flex flex-col gap-2 rounded-[14px] border border-danger/40 bg-danger/5 p-4" role="alert">
          <p className="text-[13.5px] leading-[1.6] text-ink">
            <strong className="font-medium">Este evento está en borrador: sus enlaces todavía no abren.</strong> Quien reciba uno vería una
            página de error, así que el reparto está detenido hasta publicarlo.
          </p>
          {puedePublicar ? (
            <p className="text-[13px] text-ink-soft">
              Publícalo en{' '}
              <Link className="text-gold-deep underline underline-offset-4" href={`/panel/eventos/${eventSlug}/configuracion`}>
                la ficha del evento
              </Link>
              , en «Estado».
            </p>
          ) : (
            <p className="text-[13px] text-ink-soft">Pídeselo a quien lleva tu evento: se publica desde su ficha.</p>
          )}
        </div>
      ) : null}

      {/* Dos pasos, y el segundo lo da una persona: nada sale solo de aquí. */}
      <ol className="flex flex-col gap-1.5 rounded-[14px] bg-bg-top px-4 py-3 text-[12.5px] leading-[1.6] text-ink-soft">
        <li>
          <strong className="font-medium text-ink">1. Prepara el enlace</strong> de un grupo. Cada familia tiene el suyo, con su nombre y sus
          cupos.
        </li>
        <li>
          <strong className="font-medium text-ink">2. Mándaselo tú</strong>, por WhatsApp desde aquí o copiándolo. El sistema no escribe a
          nadie por su cuenta.
        </li>
        <li className="text-ink-mute">El enlace se enseña una sola vez: de él solo guardamos su huella.</li>
      </ol>
      <p className="text-[12px] leading-[1.7] text-danger">
        Volver a prepararlo crea otro enlace y <strong className="font-medium">anula el anterior</strong>, también para quien ya lo
        tuviera, y su pase de la puerta deja de valer. Si el evento ya empezó, avísale antes.
      </p>

      {state.status === 'error' || error !== null ? (
        <p className="text-[13px] text-danger" role="alert">
          {state.status === 'error' ? state.message : error}
        </p>
      ) : null}

      {state.status === 'success' ? (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-line-panel-strong bg-bg-raised p-4" role="status">
          <p className="text-[13px] text-ink">
            Enlace de <strong className="font-normal">{state.label}</strong>, listo para mandar. Cópialo ahora: no vuelve a
            mostrarse.
          </p>
          <input
            aria-label="Enlace de la invitación"
            className="w-full rounded-[12px] border border-line-panel-strong bg-white px-3 py-2 font-mono text-[12px] text-ink"
            readOnly
            value={state.url}
          />
          <div className="flex flex-wrap gap-2.5">
            <PanelButton onClick={() => void navigator.clipboard?.writeText(state.url)}>Copiar enlace</PanelButton>
            {/* El mensaje **con el enlace dentro**, listo para pegar donde sea. Antes se copiaba
                con `{enlace}` sin sustituir, porque fuera de aquí el enlace ya no existe. */}
            <PanelButton onClick={() => void navigator.clipboard?.writeText(mensaje(state.label, state.url))}>Copiar mensaje</PanelButton>
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

          {/* Plegada: casi todo se reparte por WhatsApp. La tarjeta con el QR es para quien lo
              entrega en mano, y solo puede existir aquí y ahora: el enlace en claro se va con
              esta pantalla. */}
          <details className="group">
            <summary className="w-fit cursor-pointer list-none text-[12.5px] text-ink-soft underline underline-offset-4 hover:text-ink">
              <span className="group-open:hidden">¿La entregas en mano? Tarjeta con QR para imprimir</span>
              <span className="hidden group-open:inline">Ocultar la tarjeta</span>
            </summary>
            <div className="mt-3">
              <DeliverySheet cards={[{ label: state.label, url: state.url }]} eventTitle={eventTitle} />
            </div>
          </details>
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

            <span className="flex min-w-[240px] flex-col gap-1">
              <label className="sr-only" htmlFor={`tel-${fila.id}`}>
                Teléfono de {fila.label}
              </label>
              <CampoTelefono
                id={`tel-${fila.id}`}
                onBlur={() => {
                  setError(null)
                  // Un fallo mudo aquí deja el número en pantalla y no en la base: al
                  // reenviar, WhatsApp abriría sin destinatario.
                  void setGroupPhoneAction({ eventSlug, id: fila.id, phone: telefonos[fila.id] ?? '' }).then((resultado) => {
                    if (resultado.status === 'error') setError(resultado.message)
                  })
                }}
                onChange={(e164) => setTelefonos((previo) => ({ ...previo, [fila.id]: e164 }))}
                value={telefonos[fila.id] ?? ''}
              />
            </span>

            <form action={action}>
              <input name="eventSlug" type="hidden" value={eventSlug} />
              <input name="groupId" type="hidden" value={fila.id} />
              <PanelButton
                disabled={pending || fila.revoked || borrador || sinContenido}
                title={
                  sinContenido
                    ? 'Escribe tu invitación antes de repartir: el enlace abriría una página vacía'
                    : borrador
                    ? 'Publica el evento antes de repartir: los enlaces no abren todavía'
                    : fila.revoked
                      ? 'Reactiva la invitación antes de repartirla'
                      : fila.sent
                        ? 'Crea otro enlace y anula el que ya tiene'
                        : 'Crea su enlace para mandárselo'
                }
                type="submit"
              >
                {fila.sent ? 'Preparar otro enlace' : 'Preparar enlace'}
              </PanelButton>
            </form>

            {/* El mensaje lleva el enlace dentro, y el enlace solo existe al generarlo: por eso
                se copia arriba, junto al que se acaba de crear, y no desde una fila cualquiera. */}
            <span className="text-[12px] text-ink-mute">
              {fila.sent ? 'Ya tiene enlace: preparar otro anula el suyo' : 'Todavía sin enlace'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
