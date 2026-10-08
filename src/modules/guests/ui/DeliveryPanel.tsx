'use client'

import { EmptyState } from '@/shared/design/ui/panel/estados'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { PanelButton, Pill, type PillTone } from '@/shared/design/ui/panel/PanelKit'
import { CampoTelefono } from '@/shared/design/ui/panel/CampoTelefono'
import { ChevronIcon, CloseIcon, CopyIcon, MailIcon, MessageIcon, QrIcon, ShareIcon, WhatsAppIcon, CheckIcon } from '@/shared/design/ui/icons'
import { avatarColor } from '@/shared/design/ui/avatar-color'
import { resendInvitationAction, sendInvitationAction, setGroupPhoneAction, type ResendState } from '@/app/_acciones/guests/actions'
import { QrDigital } from '@/shared/design/ui/QrDigital'
import { renderMessage, whatsappLink } from '../domain/message-template'
import { conCanal } from '../domain/invitation-url'

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

/** Cada otra forma de enviar: un botón cuadrado con icono y su nombre debajo, como en la hoja de compartir del teléfono. */
const OTRA_FORMA = 'flex min-h-[64px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[14px] bg-bg-sunken/70 px-1 py-2 text-center text-[12px] leading-tight text-ink transition-colors hover:bg-bg-sunken aria-pressed:bg-ink aria-pressed:text-white disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:size-5'

/**
 * Enviar invitaciones, en un modal centrado. **Cada invitado tiene un enlace que no cambia**:
 * se guarda cifrado al crearlo, así que se puede mandar por WhatsApp o copiarlo y mandarlo por
 * correo, SMS o donde se quiera, las veces que haga falta. Usar cualquiera la marca enviada.
 *
 * Generar un enlace nuevo es otra cosa, y se pide aparte: anula el anterior y su pase.
 *
 * **La lista es corta y cada invitado se abre** (7 de octubre, maqueta 3 del panel móvil): una fila con
 * inicial, nombre, teléfono y estado; al tocarla, **WhatsApp grande** y debajo las demás formas como
 * iconos. En el celular eso sale **como hoja desde abajo**; en tableta y escritorio, debajo de la fila.
 */
export function DeliveryPanel({
  eventSlug,
  eventTitle,
  eventLocale,
  template,
  rows,
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
  /** El invitado abierto: su hoja con WhatsApp y las demás formas. Uno a la vez. */
  const [elegida, setElegida] = useState<string | null>(null)
  const [conQr, setConQr] = useState(false)
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
      window.open(whatsappLink({ phone: telefonos[fila.id] || null, message: mensaje(fila, conCanal(url, 'whatsapp')) }), '_blank')
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
      const destino = whatsappLink({ phone: telefonos[fila.id] || null, message: mensaje(fila, conCanal(nueva, 'whatsapp')) })
      if (ventana !== null) ventana.location.href = destino
      else window.location.href = destino
    })
  }

  const elegir = (fila: DeliveryRow) => {
    setError(null)
    setConQr(false)
    setConfirmarNuevo(null)
    setElegida((previa) => (previa === fila.id ? null : fila.id))
  }

  /**
   * Hace algo con su enlace. Casi todos lo tienen guardado; los de antes de guardarlo se preparan aquí
   * (el mismo enlace, y la invitación queda enviada). No se prepara solo al abrir la fila: mirar a un
   * invitado no es enviarle nada.
   */
  const conEnlace = (fila: DeliveryRow, hacer: (url: string) => void) => {
    setError(null)
    const url = urls[fila.id]
    if (url !== undefined) {
      hacer(url)
      return
    }
    setTrabajando(fila.id)
    empezar(async () => {
      const nueva = await pedir(fila, 'mismo')
      setTrabajando(null)
      if (nueva !== null) hacer(nueva)
    })
  }

  const copiar = (fila: DeliveryRow, texto: string, que: string) => {
    void navigator.clipboard?.writeText(texto)
    setCopiado(`${fila.id}:${que}`)
    marcar(fila)
  }

  const compartir = (fila: DeliveryRow, url: string) => {
    void navigator.share?.({ title: eventTitle, text: mensaje(fila, conCanal(url, 'compartir')) }).then(() => marcar(fila), () => {})
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
      // Tamaño fijo, haya uno o cien invitados; en el celular, una hoja alta que sube desde abajo.
      className="m-auto h-[min(820px,94dvh)] max-h-none w-[min(620px,94vw)] max-w-none flex-col overflow-hidden rounded-[18px] border border-line-panel bg-bg-raised p-0 text-ink shadow-float backdrop:bg-ink/45 open:flex max-[560px]:mb-0 max-[560px]:h-[94dvh] max-[560px]:w-screen max-[560px]:rounded-t-[26px] max-[560px]:rounded-b-none max-[560px]:border-0 motion-safe:max-[560px]:animate-slide-up"
      onCancel={(e) => {
        e.preventDefault()
        cerrar()
      }}
      ref={dialogo}
    >
      <header className="flex flex-col gap-4 border-b border-line-panel px-5 pt-5 pb-4 max-[560px]:pt-2.5 min-[560px]:px-6">
        <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-line-panel-strong min-[561px]:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[26px] leading-tight font-light italic" id="enviar-titulo">
              Enviar invitaciones
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-soft">{eventTitle}</p>
          </div>
          <button
            aria-label="Cerrar"
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line-panel text-ink-soft hover:border-ink hover:text-ink"
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
              className={`min-h-11 flex-1 cursor-pointer rounded-full px-3 py-2 text-[12.5px] transition-colors ${pestana === clave ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'}`}
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
          <ul className="flex flex-col gap-2">
            {lista.map((fila) => {
              const url = urls[fila.id]
              const abierta = elegida === fila.id
              const bloqueado = trabajando !== null
              const correo = fila.email ?? ''
              const telefono = (telefonos[fila.id] ?? '').replace(/[^0-9+]/g, '')
              const estado = pestana === 'enviadas' ? respuesta(fila) : recienEnviadas.has(fila.id) ? { tone: 'ok' as const, text: 'Enviada' } : { tone: 'pending' as const, text: 'Por enviar' }
              const preparando = trabajando === fila.id
              const mailto = (u: string) => `mailto:${encodeURIComponent(correo)}?subject=${encodeURIComponent(eventTitle)}&body=${encodeURIComponent(mensaje(fila, conCanal(u, 'correo')))}`
              const sms = (u: string) => `sms:${telefono}?&body=${encodeURIComponent(mensaje(fila, conCanal(u, 'sms')))}`
              return (
                <li aria-label={fila.label} className={`rounded-[16px] border bg-white ${abierta ? 'border-gold/50' : 'border-line-panel'}`} key={fila.id}>
                  <button
                    aria-expanded={abierta}
                    aria-label={`Formas de enviar a ${fila.label}`}
                    className="flex min-h-15 w-full cursor-pointer items-center gap-3 rounded-[16px] px-3.5 py-3 text-left transition-colors hover:bg-bg-top/60"
                    onClick={() => elegir(fila)}
                    type="button"
                  >
                    <Inicial nombre={fila.label} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] leading-snug [overflow-wrap:anywhere]">{fila.label}</span>
                      <span className="block truncate text-[12.5px] text-ink-mute">{telefono === '' ? 'Sin teléfono' : telefono}</span>
                    </span>
                    <Pill tone={estado.tone}>{estado.text}</Pill>
                    <ChevronIcon className={`size-4 shrink-0 text-ink-mute transition-transform ${abierta ? 'rotate-180' : ''}`} />
                  </button>

                  {abierta ? (
                    <>
                      {/* En el celular, la hoja se cierra tocando fuera, con la ✕ o tocando otra vez la fila. */}
                      <div aria-hidden className="fixed inset-0 z-10 bg-ink/35 min-[561px]:hidden" onClick={() => setElegida(null)} />
                      <div
                        className="flex flex-col gap-3 max-[560px]:fixed max-[560px]:inset-x-0 max-[560px]:bottom-0 max-[560px]:z-20 max-[560px]:max-h-[88dvh] max-[560px]:overflow-y-auto max-[560px]:rounded-t-[26px] max-[560px]:bg-bg-raised max-[560px]:px-5 max-[560px]:pt-2.5 max-[560px]:pb-[max(env(safe-area-inset-bottom),20px)] max-[560px]:shadow-float motion-safe:max-[560px]:animate-slide-up min-[561px]:mx-3 min-[561px]:mb-3 min-[561px]:rounded-[14px] min-[561px]:bg-bg-top/60 min-[561px]:p-4"
                        id={`otras-${fila.id}`}
                      >
                        <span aria-hidden className="mx-auto mb-1 h-1 w-10 rounded-full bg-line-panel-strong min-[561px]:hidden" />
                        <div className="flex items-center gap-3 min-[561px]:hidden">
                          <Inicial grande nombre={fila.label} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[17px] font-medium leading-snug [overflow-wrap:anywhere]">{fila.label}</span>
                            <span className="block text-[12.5px] text-ink-mute">
                              {fila.seats ?? 1} {(fila.seats ?? 1) === 1 ? 'persona' : 'personas'} · su enlace de siempre
                            </span>
                          </span>
                          <button aria-label="Cerrar" className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink-soft hover:bg-bg-top" onClick={() => setElegida(null)} type="button">
                            <CloseIcon className="size-4" />
                          </button>
                        </div>

                        {fila.revoked ? (
                          <p className="text-[13px] text-ink-soft">Esta invitación está revocada: se reabre desde «Editar invitado».</p>
                        ) : (
                          <>
                            <div>
                              <label className="mb-1 block text-[12px] text-ink-soft" htmlFor={`tel-${fila.id}`}>
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
                              aria-label={`Enviar por WhatsApp a ${fila.label}`}
                              className="flex min-h-13 cursor-pointer items-center justify-center gap-2 rounded-full bg-whatsapp px-4 py-3 text-[15px] font-medium text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={bloqueado}
                              onClick={() => porWhatsapp(fila)}
                              type="button"
                            >
                              <WhatsAppIcon className="size-5" />
                              {preparando ? 'Preparando…' : 'Mandar por WhatsApp'}
                            </button>

                            {url === undefined && fila.sent ? (
                              <p className="text-[12.5px] text-ink-soft" role="status">
                                Este invitado ya tiene su enlace: se envió antes de que el panel lo guardara, así que aquí no se puede mostrar.
                              </p>
                            ) : (
                              <div className="grid grid-cols-4 gap-2 min-[561px]:grid-cols-6">
                                <button className={OTRA_FORMA} disabled={bloqueado} onClick={() => conEnlace(fila, (u) => copiar(fila, conCanal(u, 'enlace'), 'enlace'))} type="button">
                                  <CopyIcon />
                                  {copiado === `${fila.id}:enlace` ? 'Copiado' : 'Copiar'}
                                </button>
                                <button className={OTRA_FORMA} disabled={bloqueado} onClick={() => conEnlace(fila, (u) => copiar(fila, mensaje(fila, conCanal(u, 'mensaje')), 'mensaje'))} type="button">
                                  <MessageIcon />
                                  {copiado === `${fila.id}:mensaje` ? 'Copiado' : 'Mensaje'}
                                </button>
                                {url === undefined ? (
                                  <button className={OTRA_FORMA} disabled={bloqueado} onClick={() => conEnlace(fila, (u) => window.location.assign(mailto(u)))} type="button">
                                    <MailIcon />
                                    Correo
                                  </button>
                                ) : (
                                  <a className={OTRA_FORMA} href={mailto(url)} onClick={() => marcar(fila)}>
                                    <MailIcon />
                                    Correo
                                  </a>
                                )}
                                {url === undefined ? (
                                  <button className={OTRA_FORMA} disabled={bloqueado} onClick={() => conEnlace(fila, (u) => window.location.assign(sms(u)))} type="button">
                                    <MessageIcon />
                                    SMS
                                  </button>
                                ) : (
                                  <a className={OTRA_FORMA} href={sms(url)} onClick={() => marcar(fila)}>
                                    <MessageIcon />
                                    SMS
                                  </a>
                                )}
                                <button aria-pressed={conQr} className={OTRA_FORMA} disabled={bloqueado} onClick={() => conEnlace(fila, () => setConQr((v) => !v))} type="button">
                                  <QrIcon />
                                  QR
                                </button>
                                {puedeCompartir ? (
                                  <button className={OTRA_FORMA} disabled={bloqueado} onClick={() => conEnlace(fila, (u) => compartir(fila, u))} type="button">
                                    <ShareIcon />
                                    Compartir
                                  </button>
                                ) : null}
                              </div>
                            )}

                            {url === undefined ? null : (
                              <>
                                <input
                                  aria-label={`Enlace de la invitación de ${fila.label}`}
                                  className="w-full min-w-0 rounded-[10px] border border-line-panel bg-white px-3 py-2 font-mono text-[12px] text-ink-soft"
                                  onFocus={(e) => e.currentTarget.select()}
                                  readOnly
                                  value={conCanal(url, 'enlace')}
                                />
                                {conQr ? (
                                  <div className="rounded-[14px] bg-white p-3">
                                    <QrDigital nombre={fila.label} url={conCanal(url, 'qr')} />
                                  </div>
                                ) : null}
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
                                <button className="min-h-11 w-fit cursor-pointer text-[12.5px] text-ink-mute underline underline-offset-4 hover:text-danger" onClick={() => setConfirmarNuevo(fila.id)} type="button">
                                  ¿Lo perdió? Generar un enlace nuevo
                                </button>
                              )
                            ) : null}
                          </>
                        )}
                      </div>
                    </>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </dialog>
  )
}

/** La inicial del invitado sobre su color, como en Invitados. */
function Inicial({ nombre, grande = false }: { nombre: string; grande?: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-linear-to-br font-medium text-white ${avatarColor(nombre)} ${grande ? 'size-11 text-[16px]' : 'size-9 text-[13px]'}`}
    >
      {nombre.trim().charAt(0).toUpperCase() || '·'}
    </span>
  )
}
