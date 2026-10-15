'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef } from 'react'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { compartirQr, descargarQr } from '@/shared/design/ui/QrDigital'
import { PassQrSvg } from './PassQrSvg'
import { conCanal } from '../domain/invitation-url'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * El pase de entrada del invitado: **el QR que ya tiene**, para verlo, descargarlo o compartirlo. Aquí no se
 * genera nada —pedido por el usuario—: un pase nuevo por descuido dejaría fuera al invitado que ya
 * guardó el suyo. Emitir otro enlace es una decisión aparte, en «Enviar invitaciones».
 *
 * `url` nulo: invitaciones creadas antes de guardar los enlaces (`0062`). Su pase existe, dentro
 * de su invitación, pero aquí no se puede redibujar.
 */
export function PassDialog({
  group,
  personName,
  tableLabel,
  eventTitle,
  eventMeta,
  venue,
  closeHref,
  url = null,
  codigo = null,
}: {
  /** El código corto del pase, que la puerta escribe si el QR no se lee. */
  codigo?: string | null
  group: { id: string; label: string; revoked: boolean }
  personName: string
  tableLabel: string | null
  eventTitle: string
  eventMeta: string
  venue: string | null
  eventSlug?: string
  closeHref: string
  /** Su enlace vigente, si está guardado. */
  url?: string | null
}) {
  const t = useT()
  const router = useRouter()
  // El QR abre su invitación marcada como «Código QR» (la puerta lee solo la ruta). Sin enlace
  // guardado, el código corto.
  const contenidoDelQr = url === null ? (codigo ?? '') : conCanal(url, 'qr')
  const dialogo = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()

  useEffect(() => {
    const nodo = dialogo.current
    if (nodo !== null && !nodo.open) nodo.showModal()
  }, [])

  const cerrar = () => {
    dialogo.current?.close()
    router.replace(closeHref)
  }

  const sitio = [tableLabel ?? t('Mesa por asignar', 'Table to be assigned'), venue].filter((x) => x !== null && x !== '').join(' · ')

  return (
    <dialog
      aria-labelledby={idTitulo}
      className="m-auto w-[min(420px,94vw)] rounded-[20px] border border-line-panel bg-bg p-7 text-ink shadow-float backdrop:bg-shell-deep/50"
      onCancel={(e) => {
        e.preventDefault()
        cerrar()
      }}
      ref={dialogo}
    >
      <h2 className="font-display text-[30px] leading-tight font-medium" id={idTitulo}>
        {t('Pase de entrada', 'Entry pass')}
      </h2>

      {group.revoked ? (
        <p className="mt-5 text-[13px] text-ink-soft">
          {t(`La invitación de «${group.label}» está`, `The “${group.label}” invitation is`)} <b className="font-medium">{t('revocada', 'revoked')}</b>: {t('su pase ya no abre la puerta.', 'its pass no longer opens the door.')}
        </p>
      ) : url === null && codigo === null ? (
        <>
          <p className="mt-5 text-[13px] leading-[1.7] text-ink-soft">
            {t(`${personName} ya tiene su pase dentro de la invitación que le enviaste, y la puerta lo reconoce.`, `${personName} already has their pass inside the invitation you sent, and the door recognizes it.`)}
          </p>
          <div className="mt-6 flex justify-end">
            <PanelButton onClick={cerrar}>{t('Cerrar', 'Close')}</PanelButton>
          </div>
        </>
      ) : (
        <>
          <div
            className="mt-5 flex flex-col items-center gap-4 rounded-[18px] border border-gold/40 bg-linear-to-br from-bg-top to-bg-raised p-7 text-center shadow-float"
          >
            <p className="font-mono text-[10.5px] tracking-[0.18em] text-gold-deep uppercase">{t('Pase de entrada', 'Entry pass')}</p>
            <p className="font-mono text-[10.5px] tracking-[0.2em] text-ink-mute uppercase">
              {eventTitle} · {eventMeta}
            </p>
            <div className="rounded-xl border border-line-panel bg-white p-2.5">
              <PassQrSvg label={group.label} url={contenidoDelQr} />
            </div>
            <p className="font-display text-[23px] leading-tight italic">{group.label}</p>
            <p className="text-[12px] text-ink-soft">{sitio}</p>
            {codigo === null ? null : (
              <p className="flex flex-col items-center gap-0.5">
                <span className="font-mono text-[10.5px] tracking-[0.16em] text-ink-mute uppercase">{t('Código', 'Code')}</span>
                <span className="font-codigo text-[20px] tracking-[0.16em] text-ink">{codigo}</span>
              </p>
            )}
            <span aria-hidden className="h-px w-full bg-[repeating-linear-gradient(90deg,var(--color-line-panel-strong)_0_6px,transparent_6px_12px)]" />
            {url === null ? (
              <p className="text-[11.5px] leading-[1.6] text-ink-mute">
                {t('Su invitación se envió antes de que el panel guardara los enlaces: este QR lleva su código, y la puerta lo lee igual que su pase.', 'Their invitation was sent before the panel stored links: this QR carries their code, and the door reads it just like their pass.')}
              </p>
            ) : (
              <p className="font-mono text-[10px] tracking-[0.15em] break-all text-ink-mute">{url}</p>
            )}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2 [&>*]:w-full [&>*]:justify-center [&>*]:px-2">
            <PanelButton onClick={cerrar}>{t('Cerrar', 'Close')}</PanelButton>
            <PanelButton onClick={() => void compartirQr(contenidoDelQr, group.label).catch(() => undefined)}>{t('Compartir QR', 'Share QR')}</PanelButton>
            {/* Descargar sigue después de la fiesta: no lo apaga lo celebrado. */}
            <PanelButton data-aun-celebrado="" onClick={() => void descargarQr(contenidoDelQr, group.label)} variant="primary">
              {t('Descargar QR', 'Download QR')}
            </PanelButton>
          </div>
        </>
      )}
    </dialog>
  )
}
