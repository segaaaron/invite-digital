'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { PanelButton, Pill, type PillTone } from '@/shared/design/ui/panel/PanelKit'
import { CampoTelefono } from '@/shared/design/ui/panel/CampoTelefono'
import { CloseIcon, WhatsAppIcon } from '@/shared/design/ui/icons'
import { resendInvitationAction, setGroupPhoneAction } from '@/app/_acciones/guests/actions'
import { DeliverySheet } from './DeliverySheet'
import { renderMessage, whatsappLink } from '../domain/message-template'

export type DeliveryRow = {
  readonly id: string
  readonly label: string
  readonly phone: string | null
  readonly sent: boolean
  readonly revoked: boolean
  /** Cupos confirmados en su última respuesta; `null` si no respondió. */
  readonly confirmed: number | null
}

type Pestana = 'pendientes' | 'enviadas'

/** El enlace recién preparado de una invitación: se enseña una vez, junto a ella. */
type Preparado = { readonly url: string }

function respuesta(fila: DeliveryRow): { tone: PillTone; text: string } {
  if (fila.revoked) return { tone: 'no', text: 'Revocada' }
  if (fila.confirmed === null) return { tone: 'pending', text: 'Sin responder' }
  return fila.confirmed > 0 ? { tone: 'ok', text: 'Confirmó' } : { tone: 'no', text: 'No viene' }
}

/**
 * Enviar invitaciones, en un **panel lateral**.
 *
 * Repartir es una tarea larga y repetida —un invitado tras otro— que se hace mirando la lista:
 * un modal la taparía y obligaría a abrirlo y cerrarlo por cada uno. El panel se desliza desde
 * la derecha y en el teléfono ocupa la pantalla.
 *
 * **Un toque por invitado.** «Enviar por WhatsApp» prepara el enlace, abre WhatsApp con el
 * mensaje ya escrito y lo da por repartido. La ventana se abre **antes** de pedir el enlace,
 * dentro del propio toque: abierta después de esperar al servidor, el navegador la bloquea.
 *
 * **Reenviar rota el enlace**: el anterior deja de abrir nada. Se avisa en «Enviadas», antes
 * de pulsar. El enlace nuevo se enseña una sola vez, junto a quien se le mandó: en la base
 * solo queda su hash.
 */
export function DeliveryPanel({
  eventSlug,
  eventTitle,
  eventLocale,
  template,
  rows,
  sinContenido,
  closeHref,
}: {
  eventSlug: string
  eventTitle: string
  eventLocale: string
  template: string | null
  rows: readonly DeliveryRow[]
  /** La invitación está sin terminar: el enlace abriría una página que no dice de quién es. */
  sinContenido: boolean
  /** Adónde vuelve al cerrar: la lista, sin `?panel=envio`. */
  closeHref: string
}) {
  const router = useRouter()
  const dialogo = useRef<HTMLDialogElement>(null)
  const [pestana, setPestana] = useState<Pestana>('pendientes')
  const [telefonos, setTelefonos] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((fila) => [fila.id, fila.phone ?? ''])),
  )
  const [preparados, setPreparados] = useState<Record<string, Preparado>>({})
  const [enviando, setEnviando] = useState<string | null>(null)
  /**
   * Las enviadas desde «Por enviar» en esta visita se quedan a la vista, marcadas, hasta cambiar de
   * pestaña: su enlace se enseña una sola vez y tiene que poder copiarse.
   */
  const [recienEnviadas, setRecienEnviadas] = useState<ReadonlySet<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [, empezar] = useTransition()

  useEffect(() => {
    const nodo = dialogo.current
    if (nodo !== null && !nodo.open) nodo.showModal()
  }, [])

  const cerrar = () => {
    dialogo.current?.close()
    router.replace(closeHref)
  }

  // Lo preparado en esta pantalla cuenta como enviado aunque el servidor aún no haya revalidado.
  const enviada = (fila: DeliveryRow) => fila.sent || preparados[fila.id] !== undefined
  const pendientes = rows.filter((fila) => !fila.revoked && !enviada(fila))
  const enviadas = rows.filter((fila) => fila.revoked || enviada(fila))
  const total = rows.filter((fila) => !fila.revoked).length
  const hechas = total - pendientes.length

  const mensaje = (label: string, url: string) => renderMessage({ template, locale: eventLocale, groupLabel: label, url })

  const enviarPorWhatsapp = (fila: DeliveryRow) => {
    setError(null)
    // Dentro del toque: después de esperar al servidor, el navegador bloquearía la ventana.
    const ventana = window.open('', '_blank')
    setEnviando(fila.id)
    empezar(async () => {
      const datos = new FormData()
      datos.set('eventSlug', eventSlug)
      datos.set('groupId', fila.id)
      const r = await resendInvitationAction({ status: 'idle' }, datos)
      setEnviando(null)
      if (r.status !== 'success') {
        ventana?.close()
        setError(r.status === 'error' ? r.message : 'No se pudo preparar el enlace.')
        return
      }
      setPreparados((previos) => ({ ...previos, [fila.id]: { url: r.url } }))
      if (pestana === 'pendientes') setRecienEnviadas((previas) => new Set(previas).add(fila.id))
      const destino = whatsappLink({ phone: telefonos[fila.id] || null, message: mensaje(r.label, r.url) })
      if (ventana !== null) ventana.location.href = destino
      else window.location.href = destino
    })
  }

  const guardarTelefono = (fila: DeliveryRow) => {
    setError(null)
    // Un fallo mudo aquí deja el número en pantalla y no en la base: al reenviar, WhatsApp
    // abriría sin destinatario.
    void setGroupPhoneAction({ eventSlug, id: fila.id, phone: telefonos[fila.id] ?? '' }).then((resultado) => {
      if (resultado.status === 'error') setError(resultado.message)
    })
  }

  const lista = pestana === 'pendientes' ? rows.filter((fila) => !fila.revoked && (!enviada(fila) || recienEnviadas.has(fila.id))) : enviadas

  return (
    <dialog
      aria-labelledby="enviar-titulo"
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-full flex-col bg-bg-raised p-0 text-ink shadow-float backdrop:bg-ink/40 open:flex min-[560px]:w-[min(520px,100vw)] min-[560px]:rounded-l-[22px]"
      onCancel={(e) => {
        e.preventDefault()
        cerrar()
      }}
      ref={dialogo}
    >
      <header className="flex flex-col gap-4 border-b border-line-panel px-5 pt-5 pb-4 min-[560px]:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[26px] leading-tight font-light italic" id="enviar-titulo">
              Enviar invitaciones
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-soft">{eventTitle}</p>
          </div>
          <button
            aria-label="Cerrar"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-line-panel text-ink-soft hover:border-ink hover:text-ink"
            onClick={cerrar}
            type="button"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-[13px]">{`${hechas} de ${total} enviadas`}</p>
          <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-bg-top">
            <div className="h-full rounded-full bg-sage transition-[width]" style={{ width: `${total === 0 ? 0 : (hechas / total) * 100}%` }} />
          </div>
        </div>

        <div className="flex gap-1 rounded-full bg-bg-top p-1" role="tablist">
          {(
            [
              ['pendientes', `Por enviar (${pendientes.length})`],
              ['enviadas', `Enviadas (${enviadas.length})`],
            ] as const
          ).map(([clave, texto]) => (
            <button
              aria-selected={pestana === clave}
              className={`flex-1 cursor-pointer rounded-full px-3 py-2 text-[12.5px] transition-colors ${
                pestana === clave ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
              key={clave}
              onClick={() => {
                setPestana(clave)
                setRecienEnviadas(new Set())
              }}
              role="tab"
              type="button"
            >
              {texto}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4 min-[560px]:px-6" role="tabpanel">
        {sinContenido ? (
          <div className="flex flex-col gap-2 rounded-[14px] border border-gold/50 bg-gold/10 p-4" role="alert">
            <p className="text-[13.5px] leading-[1.6]">
              <strong className="font-medium">Tu invitación está sin terminar.</strong> Termínala antes de enviar: quien abra su enlace no
              sabría de quién es, cuándo ni dónde.
            </p>
            <Link className="text-[13px] text-gold-deep underline underline-offset-4" href={`/panel/eventos/${eventSlug}/configuracion`}>
              Terminar mi invitación
            </Link>
          </div>
        ) : null}

        {error === null ? null : (
          <p className="rounded-[12px] bg-danger/10 px-4 py-3 text-[13px] text-danger" role="alert">
            {error}
          </p>
        )}

        {pestana === 'enviadas' && enviadas.length > 0 ? (
          <p className="text-[12px] leading-[1.6] text-ink-mute">
            Reenviar crea un enlace nuevo y <strong className="font-medium text-ink-soft">anula el anterior</strong>, también su pase de
            entrada. Úsalo si lo perdió; si el evento ya empezó, avísale antes.
          </p>
        ) : null}

        {lista.length === 0 ? (
          <p className="py-10 text-center text-[13.5px] text-ink-soft">
            {pestana === 'pendientes' ? 'Todas las invitaciones están enviadas.' : 'Todavía no enviaste ninguna.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {lista.map((fila) => {
              const preparado = preparados[fila.id]
              return (
                <li aria-label={fila.label} className="flex flex-col gap-3 rounded-[16px] border border-line-panel bg-white p-4" key={fila.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-[15px]">{fila.label}</span>
                    {pestana === 'enviadas' ? (
                      <Pill tone={respuesta(fila).tone}>{respuesta(fila).text}</Pill>
                    ) : recienEnviadas.has(fila.id) ? (
                      <Pill tone="ok">Enviada</Pill>
                    ) : null}
                  </div>

                  {fila.revoked || (pestana === 'pendientes' && recienEnviadas.has(fila.id)) ? null : (
                    <>
                      <div>
                        <label className="sr-only" htmlFor={`tel-${fila.id}`}>
                          Teléfono de {fila.label}
                        </label>
                        <CampoTelefono
                          id={`tel-${fila.id}`}
                          onBlur={() => guardarTelefono(fila)}
                          onChange={(e164) => setTelefonos((previo) => ({ ...previo, [fila.id]: e164 }))}
                          value={telefonos[fila.id] ?? ''}
                        />
                      </div>
                      <button
                        aria-label={`${pestana === 'pendientes' ? 'Enviar por WhatsApp a' : 'Reenviar a'} ${fila.label}`}
                        className={`flex cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-3 font-mono text-[10px] tracking-[0.25em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          pestana === 'pendientes' ? 'bg-ink text-white hover:bg-ink/90' : 'border border-line-panel-strong text-ink hover:border-ink'
                        }`}
                        disabled={sinContenido || enviando !== null}
                        onClick={() => enviarPorWhatsapp(fila)}
                        type="button"
                      >
                        <WhatsAppIcon className="size-4" />
                        {enviando === fila.id ? 'Preparando…' : pestana === 'pendientes' ? 'Enviar por WhatsApp' : 'Reenviar'}
                      </button>
                    </>
                  )}

                  {preparado === undefined ? null : (
                    <div className="flex flex-col gap-2 rounded-[12px] bg-bg-top p-3" role="status">
                      <p className="text-[12px] text-ink-soft">Enlace nuevo, se enseña una sola vez:</p>
                      <input
                        aria-label="Enlace de la invitación"
                        className="w-full rounded-[10px] border border-line-panel-strong bg-white px-3 py-2 font-mono text-[11.5px]"
                        readOnly
                        value={preparado.url}
                      />
                      <div className="flex flex-wrap gap-2">
                        <PanelButton onClick={() => void navigator.clipboard?.writeText(preparado.url)}>Copiar enlace</PanelButton>
                        <PanelButton onClick={() => void navigator.clipboard?.writeText(mensaje(fila.label, preparado.url))}>
                          Copiar mensaje
                        </PanelButton>
                      </div>
                      {/* Plegada: casi todo se reparte por WhatsApp. La tarjeta con el QR es para quien
                          la entrega en mano, y solo puede existir ahora: el enlace en claro se va con esta pantalla. */}
                      <details className="group">
                        <summary className="w-fit cursor-pointer list-none text-[12px] text-ink-soft underline underline-offset-4">
                          ¿La entregas en mano? Tarjeta con QR
                        </summary>
                        <div className="mt-3">
                          <DeliverySheet cards={[{ label: fila.label, url: preparado.url }]} eventTitle={eventTitle} />
                        </div>
                      </details>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </dialog>
  )
}
