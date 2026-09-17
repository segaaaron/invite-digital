'use client'

import { EmptyState } from '@/shared/design/ui/panel/estados'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { PanelButton, Pill, type PillTone } from '@/shared/design/ui/panel/PanelKit'
import { CampoTelefono } from '@/shared/design/ui/panel/CampoTelefono'
import { ChevronIcon, CloseIcon, MailIcon, MessageIcon, WhatsAppIcon, CheckIcon } from '@/shared/design/ui/icons'
import { resendInvitationAction, sendInvitationAction, setGroupPhoneAction, type ResendState } from '@/app/_acciones/guests/actions'
import { QrDigital } from '@/shared/design/ui/QrDigital'
import { renderMessage, whatsappLink } from '../domain/message-template'

export type DeliveryRow = {
  readonly id: string
  readonly label: string
  readonly phone: string | null
  readonly sent: boolean
  readonly revoked: boolean
  /** Cupos confirmados en su última respuesta; `null` si no respondió. */
  readonly confirmed: number | null
  /** Cupos de la invitación: con más de uno el mensaje habla de ustedes. */
  readonly seats?: number
  /** Su enlace, si está guardado. Las invitaciones de antes de guardarlo no lo tienen. */
  readonly url?: string | null
  /** El correo de quien encabeza la invitación, para escribirle desde el correo propio. */
  readonly email?: string | null
}

type Pestana = 'pendientes' | 'enviadas'

function respuesta(fila: DeliveryRow): { tone: PillTone; text: string } {
  if (fila.revoked) return { tone: 'no', text: 'Revocada' }
  if (fila.confirmed === null) return { tone: 'pending', text: 'Sin responder' }
  return fila.confirmed > 0 ? { tone: 'ok', text: 'Confirmó' } : { tone: 'no', text: 'No viene' }
}

const OTRA_FORMA = 'flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-line-panel-strong bg-white px-3 py-1.5 text-[12px] text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-40'

/**
 * Enviar invitaciones, en un modal centrado. **Cada invitado tiene un enlace que no cambia**:
 * se guarda cifrado al crearlo, así que se puede mandar por WhatsApp o copiarlo y mandarlo por
 * correo, SMS o donde se quiera, las veces que haga falta. Usar cualquiera la marca enviada.
 *
 * Generar un enlace nuevo es otra cosa, y se pide aparte: anula el anterior y su pase.
 */
export function DeliveryPanel({
  eventSlug,
  eventTitle,
  eventLocale,
  template,
  rows,
  sinContenido,
  closeHref,
  fechaDelEvento = null,
}: {
  eventSlug: string
  eventTitle: string
  eventLocale: string
  /** El día, ya legible, para el mensaje: «sábado, 17 de octubre». */
  fechaDelEvento?: string | null
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
  const [telefonos, setTelefonos] = useState<Record<string, string>>(Object.fromEntries(rows.map((fila) => [fila.id, fila.phone ?? ''])))
  const [urls, setUrls] = useState<Record<string, string>>(Object.fromEntries(rows.flatMap((fila) => (fila.url ? [[fila.id, fila.url]] : []))))
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set())
  /** Las que se enviaron en esta visita se quedan en «Por enviar» hasta cambiar de pestaña. */
  const [recienEnviadas, setRecienEnviadas] = useState<ReadonlySet<string>>(new Set())
  const [abiertas, setAbiertas] = useState<ReadonlySet<string>>(new Set())
  const [confirmarNuevo, setConfirmarNuevo] = useState<string | null>(null)
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)
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

  const enviada = (fila: DeliveryRow) => fila.sent || marcadas.has(fila.id)
  const pendientes = rows.filter((fila) => !fila.revoked && !enviada(fila))
  const enviadas = rows.filter((fila) => fila.revoked || enviada(fila))
  const total = rows.filter((fila) => !fila.revoked).length
  const hechas = total - pendientes.length

  const mensaje = (fila: DeliveryRow, url: string) =>
    renderMessage({ template, locale: eventLocale, groupLabel: fila.label, url, seats: fila.seats ?? 1, fecha: fechaDelEvento, evento: eventTitle })

  const alternar = (conjunto: ReadonlySet<string>, id: string) => {
    const nuevo = new Set(conjunto)
    if (nuevo.has(id)) nuevo.delete(id)
    else nuevo.add(id)
    return nuevo
  }

  /** Pide al servidor el enlace —el mismo, o uno nuevo— y la marca enviada. */
  const pedir = async (fila: DeliveryRow, modo: 'mismo' | 'nuevo'): Promise<string | null> => {
    const datos = new FormData()
    datos.set('eventSlug', eventSlug)
    datos.set('groupId', fila.id)
    const r: ResendState = await (modo === 'nuevo' ? resendInvitationAction : sendInvitationAction)({ status: 'idle' }, datos)
    if (r.status !== 'success') {
      setError(r.status === 'error' ? r.message : 'No se pudo preparar el enlace.')
      return null
    }
    setUrls((previas) => ({ ...previas, [fila.id]: r.url }))
    setMarcadas((previas) => new Set(previas).add(fila.id))
    if (pestana === 'pendientes') setRecienEnviadas((previas) => new Set(previas).add(fila.id))
    return r.url
  }

  /** Marcar enviada sin esperar: el enlace ya está en pantalla. */
  const marcar = (fila: DeliveryRow) => {
    if (enviada(fila)) return
    empezar(async () => {
      await pedir(fila, 'mismo')
    })
  }

  const porWhatsapp = (fila: DeliveryRow) => {
    setError(null)
    const url = urls[fila.id]
    if (url !== undefined) {
      window.open(whatsappLink({ phone: telefonos[fila.id] || null, message: mensaje(fila, url) }), '_blank')
      marcar(fila)
      return
    }
    // Sin enlace guardado: la ventana se abre dentro del toque, o el navegador la bloquea.
    const ventana = window.open('', '_blank')
    setTrabajando(fila.id)
    empezar(async () => {
      const nueva = await pedir(fila, 'mismo')
      setTrabajando(null)
      if (nueva === null) {
        ventana?.close()
        return
      }
      const destino = whatsappLink({ phone: telefonos[fila.id] || null, message: mensaje(fila, nueva) })
      if (ventana !== null) ventana.location.href = destino
      else window.location.href = destino
    })
  }

  const abrirOtras = (fila: DeliveryRow) => {
    setError(null)
    setAbiertas((previas) => alternar(previas, fila.id))
    if (urls[fila.id] === undefined && !abiertas.has(fila.id)) {
      setTrabajando(fila.id)
      empezar(async () => {
        await pedir(fila, 'mismo')
        setTrabajando(null)
      })
    }
  }

  const copiar = (fila: DeliveryRow, texto: string, que: string) => {
    void navigator.clipboard?.writeText(texto)
    setCopiado(`${fila.id}:${que}`)
    marcar(fila)
  }

  const compartir = (fila: DeliveryRow, url: string) => {
    void navigator.share?.({ title: eventTitle, text: mensaje(fila, url) }).then(() => marcar(fila), () => {})
  }

  const enlaceNuevo = (fila: DeliveryRow) => {
    setError(null)
    setConfirmarNuevo(null)
    setTrabajando(fila.id)
    empezar(async () => {
      await pedir(fila, 'nuevo')
      setTrabajando(null)
    })
  }

  const guardarTelefono = (fila: DeliveryRow) => {
    setError(null)
    void setGroupPhoneAction({ eventSlug, id: fila.id, phone: telefonos[fila.id] ?? '' }).then((resultado) => {
      if (resultado.status === 'error') setError(resultado.message)
    })
  }

  const lista = pestana === 'pendientes' ? rows.filter((fila) => !fila.revoked && (!enviada(fila) || recienEnviadas.has(fila.id))) : enviadas
  const puedeCompartir = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <dialog
      aria-labelledby="enviar-titulo"
      // Tamaño fijo, haya uno o cien invitados; en el celular ocupa la pantalla entera.
      className="m-auto h-[min(820px,94dvh)] max-h-none w-[min(620px,94vw)] max-w-none flex-col overflow-hidden rounded-[18px] border border-line-panel bg-bg-raised p-0 text-ink shadow-float backdrop:bg-ink/45 open:flex max-[560px]:h-dvh max-[560px]:w-screen max-[560px]:rounded-none max-[560px]:border-0"
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
              className={`flex-1 cursor-pointer rounded-full px-3 py-2 text-[12.5px] transition-colors ${pestana === clave ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'}`}
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

        {lista.length === 0 ? (
          <EmptyState
            compact
            description={pestana === 'pendientes' ? 'Las enviadas siguen en su pestaña, por si hay que volver a mandarlas.' : 'Empieza por «Por enviar»: WhatsApp o su enlace, por donde quieras.'}
            icon={pestana === 'pendientes' ? <CheckIcon /> : <MailIcon />}
            title={pestana === 'pendientes' ? 'Todas tus invitaciones salieron' : 'Aún no enviaste ninguna'}
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {lista.map((fila) => {
              const url = urls[fila.id]
              const abierta = abiertas.has(fila.id)
              const bloqueado = sinContenido || trabajando !== null
              const correo = fila.email ?? ''
              const telefono = (telefonos[fila.id] ?? '').replace(/[^0-9+]/g, '')
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

                  {fila.revoked ? null : (
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

                      <div className="grid gap-2 min-[480px]:grid-cols-2">
                        <button
                          aria-label={`Enviar por WhatsApp a ${fila.label}`}
                          className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13px] text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={bloqueado}
                          onClick={() => porWhatsapp(fila)}
                          type="button"
                        >
                          <WhatsAppIcon className="size-4" />
                          {trabajando === fila.id && !abierta ? 'Preparando…' : 'WhatsApp'}
                        </button>
                        <button
                          aria-controls={`otras-${fila.id}`}
                          aria-expanded={abierta}
                          className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-line-panel-strong px-4 py-2.5 text-[13px] text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={sinContenido}
                          onClick={() => abrirOtras(fila)}
                          type="button"
                        >
                          Enlace y otras formas
                          <ChevronIcon className={`size-3.5 transition-transform ${abierta ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      {abierta ? (
                        <div className="flex flex-col gap-3 rounded-[14px] bg-bg-top p-3.5" id={`otras-${fila.id}`}>
                          {url === undefined ? (
                            <p className="text-[12.5px] text-ink-soft" role="status">
                              {trabajando === fila.id
                                ? 'Preparando su enlace…'
                                : fila.sent
                                  ? 'Este invitado ya tiene su enlace: se envió antes de que el panel lo guardara, así que aquí no se puede mostrar.'
                                  : 'No se pudo preparar el enlace.'}
                            </p>
                          ) : (
                            <>
                              <p className="text-[12px] text-ink-soft">Su enlace, para mandarlo por donde quieras. Es siempre el mismo.</p>
                              <div className="flex gap-2">
                                <input
                                  aria-label={`Enlace de la invitación de ${fila.label}`}
                                  className="min-w-0 flex-1 rounded-[10px] border border-line-panel-strong bg-white px-3 py-2 font-mono text-[11.5px]"
                                  onFocus={(e) => e.currentTarget.select()}
                                  readOnly
                                  value={url}
                                />
                                <button className="shrink-0 cursor-pointer rounded-full bg-ink px-3.5 py-1.5 text-[12px] text-white hover:bg-ink/90" onClick={() => copiar(fila, url, 'enlace')} type="button">
                                  {copiado === `${fila.id}:enlace` ? 'Copiado' : 'Copiar'}
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button className={OTRA_FORMA} onClick={() => copiar(fila, mensaje(fila, url), 'mensaje')} type="button">
                                  {copiado === `${fila.id}:mensaje` ? 'Copiado' : 'Copiar mensaje'}
                                </button>
                                <a
                                  className={OTRA_FORMA}
                                  href={`mailto:${encodeURIComponent(correo)}?subject=${encodeURIComponent(eventTitle)}&body=${encodeURIComponent(mensaje(fila, url))}`}
                                  onClick={() => marcar(fila)}
                                >
                                  <MailIcon className="size-4" />
                                  Correo
                                </a>
                                <a className={OTRA_FORMA} href={`sms:${telefono}?&body=${encodeURIComponent(mensaje(fila, url))}`} onClick={() => marcar(fila)}>
                                  <MessageIcon className="size-4" />
                                  SMS
                                </a>
                                {puedeCompartir ? (
                                  <button className={OTRA_FORMA} onClick={() => compartir(fila, url)} type="button">
                                    Compartir
                                  </button>
                                ) : null}
                              </div>
                              <div className="border-t border-line-panel pt-3">
                                <QrDigital nombre={fila.label} url={url} />
                              </div>
                            </>
                          )}

                          {pestana === 'enviadas' ? (
                            confirmarNuevo === fila.id ? (
                              <div className="flex flex-col gap-2 border-t border-line-panel pt-3" role="alert">
                                <p className="text-[12.5px] leading-[1.6] text-ink">
                                  El enlace actual y su pase de entrada <strong className="font-medium">dejarán de servir</strong>. Úsalo solo si lo perdió o
                                  llegó a quien no debía.
                                </p>
                                <div className="flex gap-2">
                                  <PanelButton disabled={bloqueado} onClick={() => enlaceNuevo(fila)} variant="danger">
                                    Sí, generar uno nuevo
                                  </PanelButton>
                                  <PanelButton onClick={() => setConfirmarNuevo(null)}>Cancelar</PanelButton>
                                </div>
                              </div>
                            ) : (
                              <button className="w-fit cursor-pointer text-[12px] text-ink-mute underline underline-offset-4 hover:text-danger" onClick={() => setConfirmarNuevo(fila.id)} type="button">
                                ¿Lo perdió? Generar un enlace nuevo
                              </button>
                            )
                          ) : null}
                        </div>
                      ) : null}
                    </>
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
