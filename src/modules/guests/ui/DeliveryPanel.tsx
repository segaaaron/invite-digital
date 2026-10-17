'use client'

import { EmptyState } from '@/shared/design/ui/panel/estados'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Iniciales, PanelButton, Pill, type PillTone } from '@/shared/design/ui/panel/PanelKit'
import { CampoTelefono } from '@/shared/design/ui/panel/CampoTelefono'
import { CloseIcon, CopyIcon, MailIcon, MessageIcon, QrIcon, ShareIcon, WhatsAppIcon, CheckIcon } from '@/shared/design/ui/icons'
import { resendInvitationAction, sendInvitationAction, setGroupPhoneAction, type ResendState } from '@/app/_acciones/guests/actions'
import { QrDigital } from '@/shared/design/ui/QrDigital'
import { renderMessage, whatsappLink } from '../domain/message-template'
import { conCanal } from '../domain/invitation-url'
import { useT } from '@/shared/i18n/idioma-navegador'
import type { T } from '@/shared/i18n/t'

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

function respuesta(fila: DeliveryRow, t: T): { tone: PillTone; text: string } {
  if (fila.revoked) return { tone: 'no', text: t('Revocada', 'Revoked') }
  if (fila.confirmed === null) return { tone: 'pending', text: t('Sin responder', 'No reply') }
  return fila.confirmed > 0 ? { tone: 'ok', text: t('Viene', 'Coming') } : { tone: 'no', text: t('No viene', 'Not coming') }
}

/** Cada otra forma de enviar: un botón cuadrado con icono y su nombre debajo, como en la hoja de compartir del teléfono. */
const OTRA_FORMA = 'flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-line-panel-strong bg-bg-raised px-2 py-2 text-center text-[14px] font-medium leading-tight text-ink transition-colors hover:border-gold aria-pressed:border-shell-deep aria-pressed:bg-shell-deep aria-pressed:text-shell-ink disabled:cursor-not-allowed disabled:opacity-40 max-[767px]:min-h-[68px] max-[767px]:flex-col max-[767px]:gap-1.5 [&>svg]:size-4'

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
  portada = null,
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
  /** La portada de su invitación: la vista previa del mensaje la enseña como la verá en WhatsApp. */
  portada?: string | null
}) {
  const t = useT()
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
      setError(r.status === 'error' ? r.message : t('No se pudo preparar el enlace.', 'The link couldn’t be prepared.'))
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

  // La de la derecha (E37): la elegida o, en tableta y escritorio, la primera de la lista. En el celular solo sube la
  // hoja al tocar una (M10).
  const enVista = lista.find((f) => f.id === elegida) ?? lista[0] ?? null

  const detalle = (fila: DeliveryRow) => {
    const url = urls[fila.id]
    const bloqueado = trabajando !== null
    const correo = fila.email ?? ''
    const telefono = (telefonos[fila.id] ?? '').replace(/[^0-9+]/g, '')
    const preparando = trabajando === fila.id
    const mailto = (u: string) => `mailto:${encodeURIComponent(correo)}?subject=${encodeURIComponent(eventTitle)}&body=${encodeURIComponent(mensaje(fila, conCanal(u, 'correo')))}`
    const sms = (u: string) => `sms:${telefono}?&body=${encodeURIComponent(mensaje(fila, conCanal(u, 'sms')))}`
    const muestra = mensaje(fila, url === undefined ? '' : conCanal(url, 'whatsapp')).trim()
    return (
      <section
        aria-label={t(`Enviar a ${fila.label}`, `Send to ${fila.label}`)}
        className={`flex flex-col gap-3 max-[767px]:fixed max-[767px]:inset-x-0 max-[767px]:bottom-0 max-[767px]:z-20 max-[767px]:max-h-[88dvh] max-[767px]:overflow-y-auto max-[767px]:rounded-t-[24px] max-[767px]:bg-bg max-[767px]:px-5 max-[767px]:pt-2.5 max-[767px]:pb-[max(env(safe-area-inset-bottom),20px)] max-[767px]:shadow-float motion-safe:max-[767px]:animate-slide-up ${elegida === fila.id ? '' : 'max-[767px]:hidden'}`}
        id={`otras-${fila.id}`}
      >
        <span aria-hidden className="mx-auto mb-1 h-1 w-10 rounded-full bg-line-panel-strong min-[768px]:hidden" />
        <div className="flex items-start justify-between gap-3 min-[768px]:hidden">
          <p className="font-display text-[26px] leading-tight font-medium">{t(`Enviar a ${fila.label}`, `Send to ${fila.label}`)}</p>
          <button aria-label={t('Volver a la lista', 'Back to the list')} className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-line-panel-strong bg-bg-raised" onClick={() => setElegida(null)} type="button">
            <CloseIcon className="size-4" />
          </button>
        </div>

        {fila.revoked ? (
          <p className="text-[14px] text-ink-soft">{t('Esta invitación está revocada: se reabre desde «Editar invitado».', 'This invitation is revoked: reopen it from “Edit guest”.')}</p>
        ) : (
          <>
            {/* Así le llega: la portada y el mensaje, como en el chat. */}
            <div className="overflow-hidden rounded-[14px] border border-line-panel bg-bg-sunken p-2.5 max-[767px]:p-0">
              <div className="overflow-hidden rounded-[10px] bg-bg-raised max-[767px]:rounded-[14px]">
                {portada ? (
                  // La portada del diseño, decorativa: el mensaje va debajo, en texto.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" className="h-[130px] w-full object-cover" src={portada} />
                ) : null}
                <p className="px-3.5 py-3 text-[14px] leading-[1.5] whitespace-pre-line text-ink line-clamp-4">{muestra}</p>
              </div>
            </div>

            <button
              aria-label={t(`Enviar por WhatsApp a ${fila.label}`, `Send via WhatsApp to ${fila.label}`)}
              className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-whatsapp px-4 text-[15px] font-medium text-white transition-colors hover:bg-whatsapp-hover disabled:cursor-not-allowed disabled:opacity-40"
              disabled={bloqueado}
              onClick={() => porWhatsapp(fila)}
              type="button"
            >
              <WhatsAppIcon className="size-5" />
              {preparando ? t('Preparando…', 'Preparing…') : t('Enviar por WhatsApp', 'Send via WhatsApp')}
            </button>

            {url === undefined && fila.sent ? (
              <p className="text-[13px] text-ink-soft" role="status">
                {t('Este invitado ya tiene su enlace: se envió antes de que el panel lo guardara, así que aquí no se puede mostrar.', 'This guest already has their link: it was sent before the panel stored it, so it can’t be shown here.')}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <button className={OTRA_FORMA} disabled={bloqueado} onClick={() => conEnlace(fila, (u) => copiar(fila, conCanal(u, 'enlace'), 'enlace'))} type="button">
                  <CopyIcon />
                  {copiado === `${fila.id}:enlace` ? t('Copiado', 'Copied') : (
                    <span>
                      <span className="min-[768px]:hidden">{t('Copiar enlace', 'Copy link')}</span>
                      <span className="max-[767px]:hidden">{t('Enlace', 'Link')}</span>
                    </span>
                  )}
                </button>
                <button className={OTRA_FORMA} disabled={bloqueado} onClick={() => conEnlace(fila, (u) => copiar(fila, mensaje(fila, conCanal(u, 'mensaje')), 'mensaje'))} type="button">
                  <MessageIcon />
                  {copiado === `${fila.id}:mensaje` ? t('Copiado', 'Copied') : (
                    <span>
                      <span className="min-[768px]:hidden">{t('Copiar mensaje', 'Copy message')}</span>
                      <span className="max-[767px]:hidden">{t('Mensaje', 'Message')}</span>
                    </span>
                  )}
                </button>
                <button aria-pressed={conQr} className={OTRA_FORMA} disabled={bloqueado} onClick={() => conEnlace(fila, () => setConQr((v) => !v))} type="button">
                  <QrIcon />
                  {t('Código QR', 'QR code')}
                </button>
              </div>
            )}

            {url === undefined || !conQr ? null : (
              <div className="rounded-[14px] border border-line-panel bg-bg-raised p-3">
                <QrDigital nombre={fila.label} url={conCanal(url, 'qr')} />
              </div>
            )}

            <p className="text-center text-[13px] text-ink-mute min-[768px]:hidden">{t('Al enviarla, la marcamos como enviada.', 'Once you send it, we mark it as sent.')}</p>

            <details className="group text-[14px]">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-ink-mute hover:text-ink [&::-webkit-details-marker]:hidden">
                {t('Su teléfono, el enlace y otras formas', 'Their phone, the link and other ways')}
              </summary>
              <div className="mt-2 flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-[13px] text-ink-soft" htmlFor={`tel-${fila.id}`}>
                    {t(`Teléfono de ${fila.label}`, `${fila.label}’s phone`)}
                  </label>
                  <CampoTelefono
                    id={`tel-${fila.id}`}
                    onBlur={() => guardarTelefono(fila)}
                    onChange={(e164) => setTelefonos((previo) => ({ ...previo, [fila.id]: e164 }))}
                    value={telefonos[fila.id] ?? ''}
                  />
                </div>
                {url === undefined ? null : (
                  <input
                    aria-label={t(`Enlace de la invitación de ${fila.label}`, `${fila.label}’s invitation link`)}
                    className="w-full min-w-0 rounded-[10px] border border-line-panel bg-bg-raised px-3 py-2 font-codigo text-[12.5px] text-ink-soft"
                    onFocus={(e) => e.currentTarget.select()}
                    readOnly
                    value={conCanal(url, 'enlace')}
                  />
                )}
                <div className="grid grid-cols-3 gap-2">
                  {url === undefined ? (
                    <button className={OTRA_FORMA} disabled={bloqueado} onClick={() => conEnlace(fila, (u) => window.location.assign(mailto(u)))} type="button">
                      <MailIcon />
                      {t('Correo', 'Email')}
                    </button>
                  ) : (
                    <a className={OTRA_FORMA} href={mailto(url)} onClick={() => marcar(fila)}>
                      <MailIcon />
                      {t('Correo', 'Email')}
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
                  {puedeCompartir ? (
                    <button className={OTRA_FORMA} disabled={bloqueado} onClick={() => conEnlace(fila, (u) => compartir(fila, u))} type="button">
                      <ShareIcon />
                      {t('Compartir', 'Share')}
                    </button>
                  ) : null}
                </div>
              </div>
            </details>

            {pestana === 'enviadas' ? (
              confirmarNuevo === fila.id ? (
                <div className="flex flex-col gap-2 border-t border-line-panel pt-3" role="alert">
                  <p className="text-[13.5px] leading-[1.6] text-ink">
                    {t('El enlace actual y su pase de entrada', 'The current link and its entry pass')} <strong className="font-medium">{t('dejarán de servir', 'will stop working')}</strong>. {t('Úsalo solo si lo perdió o llegó a quien no debía.', 'Only use this if they lost it or it reached the wrong person.')}
                  </p>
                  <div className="flex gap-2">
                    <PanelButton disabled={bloqueado} onClick={() => enlaceNuevo(fila)} variant="danger">
                      {t('Sí, generar uno nuevo', 'Yes, generate a new one')}
                    </PanelButton>
                    <PanelButton onClick={() => setConfirmarNuevo(null)}>{t('Cancelar', 'Cancel')}</PanelButton>
                  </div>
                </div>
              ) : (
                <button className="min-h-11 w-fit cursor-pointer text-[13px] text-ink-mute underline underline-offset-4 hover:text-danger" onClick={() => setConfirmarNuevo(fila.id)} type="button">
                  {t('¿Lo perdió? Generar un enlace nuevo', 'Lost it? Generate a new link')}
                </button>
              )
            ) : null}
          </>
        )}
      </section>
    )
  }

  return (
    <dialog
      aria-labelledby="enviar-titulo"
      // Tamaño fijo, haya uno o cien invitados; en el celular, una hoja alta que sube desde abajo.
      className="m-auto h-[min(640px,92dvh)] max-h-none w-[min(820px,94vw)] max-w-none flex-col overflow-hidden rounded-[20px] border border-line-panel bg-bg p-0 text-ink shadow-float backdrop:bg-shell-deep/50 open:flex max-[767px]:mb-0 max-[767px]:h-[94dvh] max-[767px]:w-screen max-[767px]:rounded-t-[24px] max-[767px]:rounded-b-none max-[767px]:border-0 motion-safe:max-[767px]:animate-slide-up"
      onCancel={(e) => {
        e.preventDefault()
        cerrar()
      }}
      ref={dialogo}
    >
      <header className="flex flex-col gap-3 px-7 pt-6 pb-0 max-[767px]:px-5 max-[767px]:pt-2.5">
        <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-line-panel-strong min-[768px]:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[30px] leading-tight font-medium max-[767px]:text-[26px]" id="enviar-titulo">
              {t('Enviar invitaciones', 'Send invitations')}
            </h2>
            <p className="mt-1 text-[15px] text-ink-mute">
              <span>{t(`${hechas} de ${total} enviadas`, `${hechas} of ${total} sent`)}</span>. {t('Al enviar una, la marcamos para que no la repitas.', 'When you send one, we mark it so you don’t repeat it.')}
            </p>
          </div>
          <button
            aria-label={t('Cerrar', 'Close')}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-line-panel-strong bg-bg-raised hover:border-gold"
            onClick={cerrar}
            type="button"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>

        <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-line-panel">
          <div className="h-full rounded-full bg-shell-deep transition-[width]" style={{ width: `${total === 0 ? 0 : (hechas / total) * 100}%` }} />
        </div>

        <div className="flex gap-6 border-b border-line-panel" role="tablist">
          {(
            [
              ['pendientes', t('Por enviar', 'To send'), pendientes.length],
              ['enviadas', t('Enviadas', 'Sent'), enviadas.length],
            ] as const
          ).map(([clave, texto, cuenta]) => (
            <button
              aria-label={`${texto} (${cuenta})`}
              aria-selected={pestana === clave}
              className={`-mb-px min-h-11 cursor-pointer border-b-2 text-[15px] transition-colors ${pestana === clave ? 'border-shell-deep font-medium text-ink' : 'border-transparent text-ink-mute hover:text-ink'}`}
              key={clave}
              onClick={() => {
                setPestana(clave)
                setRecienEnviadas(new Set())
              }}
              role="tab"
              type="button"
            >
              {texto}
              <span aria-hidden className="ml-1.5 text-ink-mute">
                {cuenta}
              </span>
            </button>
          ))}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-7 py-5 max-[767px]:px-5 min-[768px]:grid-cols-[260px_minmax(0,1fr)]" role="tabpanel">
        {error === null ? null : (
          <p className="rounded-[12px] bg-pill-no px-4 py-3 text-[14px] text-pill-no-ink min-[768px]:col-span-2" role="alert">
            {error}
          </p>
        )}

        {lista.length === 0 ? (
          <div className="min-[768px]:col-span-2">
            <EmptyState
              compact
              description={pestana === 'pendientes' ? t('Las enviadas siguen en su pestaña, por si hay que volver a mandarlas.', 'Sent ones stay in their tab, in case you need to send them again.') : t('Empieza por «Por enviar»: WhatsApp o su enlace, por donde quieras.', 'Start with “To send”: WhatsApp or the link, whichever you like.')}
              icon={pestana === 'pendientes' ? <CheckIcon /> : <MailIcon />}
              title={pestana === 'pendientes' ? t('Todas tus invitaciones salieron', 'All your invitations went out') : t('Aún no enviaste ninguna', 'You haven’t sent any yet')}
            />
          </div>
        ) : (
          <>
            <ul className="flex min-w-0 flex-col gap-1.5">
              {lista.map((fila) => {
                const telefono = (telefonos[fila.id] ?? '').replace(/[^0-9+]/g, '')
                const estado = pestana === 'enviadas' ? respuesta(fila, t) : recienEnviadas.has(fila.id) ? { tone: 'ok' as const, text: t('Enviada', 'Sent') } : null
                const activa = enVista?.id === fila.id
                return (
                  <li aria-label={fila.label} key={fila.id}>
                    <button
                      aria-controls={`otras-${fila.id}`}
                      aria-expanded={elegida === fila.id}
                      aria-label={t(`Formas de enviar a ${fila.label}`, `Ways to send to ${fila.label}`)}
                      className={`flex min-h-15 w-full cursor-pointer items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left transition-colors ${activa ? 'min-[768px]:border-gold min-[768px]:bg-bg-raised' : 'border-transparent hover:bg-fila'} max-[767px]:border-line-panel max-[767px]:bg-bg-raised`}
                      onClick={() => elegir(fila)}
                      type="button"
                    >
                      <Iniciales chico nombre={fila.label} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] leading-snug font-medium [overflow-wrap:anywhere]">{fila.label}</span>
                        <span className="block truncate text-[13px] text-ink-mute">
                          {fila.seats ?? 1} {(fila.seats ?? 1) === 1 ? t('persona', 'person') : t('personas', 'people')}, {telefono === '' ? t('sin teléfono', 'no phone') : telefono}
                        </span>
                      </span>
                      {estado === null ? null : <Pill tone={estado.tone}>{estado.text}</Pill>}
                    </button>
                  </li>
                )
              })}
            </ul>
            {enVista === null ? null : (
              <>
                {/* En el celular, la hoja se cierra tocando fuera o con la ✕. */}
                {elegida === null ? null : <div aria-hidden className="fixed inset-0 z-10 bg-shell-deep/40 min-[768px]:hidden" onClick={() => setElegida(null)} />}
                <div className="min-w-0">{detalle(enVista)}</div>
              </>
            )}
          </>
        )}
      </div>
    </dialog>
  )
}
