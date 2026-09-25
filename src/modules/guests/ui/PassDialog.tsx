'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef } from 'react'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { compartirQr, descargarQr } from '@/shared/design/ui/QrDigital'
import { PassQrSvg } from './PassQrSvg'

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
  const router = useRouter()
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

  const sitio = [tableLabel ?? 'Mesa por asignar', venue].filter((x) => x !== null && x !== '').join(' · ')

  return (
    <dialog
      aria-labelledby={idTitulo}
      className="m-auto w-[min(420px,94vw)] rounded-[18px] border border-line-panel bg-bg-raised p-7 text-ink shadow-float backdrop:bg-ink/45"
      onCancel={(e) => {
        e.preventDefault()
        cerrar()
      }}
      ref={dialogo}
    >
      <h2 className="font-display text-[24px] font-light italic" id={idTitulo}>
        Pase de entrada
      </h2>

      {group.revoked ? (
        <p className="mt-5 text-[13px] text-ink-soft">
          La invitación de «{group.label}» está <b className="font-medium">revocada</b>: su pase ya no abre la puerta.
        </p>
      ) : url === null && codigo === null ? (
        <>
          <p className="mt-5 text-[13px] leading-[1.7] text-ink-soft">
            {personName} ya tiene su pase dentro de la invitación que le enviaste, y la puerta lo reconoce.
          </p>
          <div className="mt-6 flex justify-end">
            <PanelButton onClick={cerrar}>Cerrar</PanelButton>
          </div>
        </>
      ) : (
        <>
          <div
            className="mt-5 flex flex-col items-center gap-4 rounded-[18px] border border-gold/40 bg-linear-to-br from-bg-top to-bg-raised p-7 text-center shadow-float"
          >
            <p className="font-mono text-[10.5px] tracking-[0.18em] text-gold-deep uppercase">Pase de entrada</p>
            <p className="font-mono text-[10.5px] tracking-[0.2em] text-ink-mute uppercase">
              {eventTitle} · {eventMeta}
            </p>
            <div className="rounded-xl border border-line-panel bg-white p-2.5">
              <PassQrSvg label={group.label} url={url ?? codigo ?? ''} />
            </div>
            <p className="font-display text-[23px] leading-tight italic">{group.label}</p>
            <p className="text-[12px] text-ink-soft">{sitio}</p>
            {codigo === null ? null : (
              <p className="flex flex-col items-center gap-0.5">
                <span className="font-mono text-[10.5px] tracking-[0.16em] text-ink-mute uppercase">Código</span>
                <span className="font-mono text-[20px] tracking-[0.16em] text-ink">{codigo}</span>
              </p>
            )}
            <span aria-hidden className="h-px w-full bg-[repeating-linear-gradient(90deg,var(--color-line-panel-strong)_0_6px,transparent_6px_12px)]" />
            {url === null ? (
              <p className="text-[11.5px] leading-[1.6] text-ink-mute">
                Su invitación se envió antes de que el panel guardara los enlaces: este QR lleva su código, y la puerta lo lee igual que su pase.
              </p>
            ) : (
              <p className="font-mono text-[10px] tracking-[0.15em] break-all text-ink-mute">{url}</p>
            )}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2 [&>*]:w-full [&>*]:justify-center [&>*]:px-2">
            <PanelButton onClick={cerrar}>Cerrar</PanelButton>
            <PanelButton onClick={() => void compartirQr(url ?? codigo ?? '', group.label).catch(() => undefined)}>Compartir QR</PanelButton>
            <PanelButton onClick={() => void descargarQr(url ?? codigo ?? '', group.label)} variant="primary">
              Descargar QR
            </PanelButton>
          </div>
        </>
      )}
    </dialog>
  )
}
