'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { resendInvitationAction, type ResendState } from '@/app/_acciones/guests/actions'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { printMarkedOnly } from '@/shared/design/ui/print'
import { PassQrSvg } from './PassQrSvg'
import { SubmitButton } from '@/shared/design/ui/panel/estados'

const INICIAL: ResendState = { status: 'idle' }

/**
 * El pase de entrada imprimible: el QR del enlace del invitado.
 *
 * El enlace se guarda cifrado al crear la invitación, así que el pase **es el que ya tiene**
 * y se enseña al abrir. Generar uno nuevo se pide aparte, porque anula el anterior. Solo las
 * invitaciones de antes de guardar el enlace (`url` nulo) tienen que generarlo.
 */
export function PassDialog({
  group,
  personName,
  tableLabel,
  eventTitle,
  eventMeta,
  venue,
  eventSlug,
  closeHref,
  url = null,
}: {
  /** Su enlace vigente, si está guardado. */
  url?: string | null
  group: { id: string; label: string; revoked: boolean }
  personName: string
  tableLabel: string | null
  eventTitle: string
  eventMeta: string
  venue: string | null
  eventSlug: string
  closeHref: string
}) {
  const router = useRouter()
  const dialogo = useRef<HTMLDialogElement>(null)
  const [estado, accion, pendiente] = useActionState<ResendState, FormData>(resendInvitationAction, INICIAL)
  const idTitulo = useId()

  useEffect(() => {
    const nodo = dialogo.current
    if (nodo !== null && !nodo.open) nodo.showModal()
  }, [])

  const cerrar = () => {
    dialogo.current?.close()
    router.replace(closeHref)
  }

  const [confirmar, setConfirmar] = useState(false)
  const emitido = estado.status === 'success' ? estado : url === null ? null : { url }
  const sitio = [tableLabel ?? 'Mesa por asignar', venue].filter((x) => x !== null && x !== '').join(' · ')

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={idTitulo}
      className="m-auto w-[min(380px,94vw)] rounded-[18px] border border-line-panel bg-bg-raised p-7 text-ink shadow-float backdrop:bg-ink/45"
      onCancel={(e) => {
        e.preventDefault()
        cerrar()
      }}
    >
      <h2 className="font-display text-[24px] font-light italic" id={idTitulo}>
        Pase de entrada
      </h2>

      {group.revoked ? (
        <p className="mt-5 text-[13px] text-ink-soft">
          La invitación de «{group.label}» está <b className="font-medium">revocada</b>. Revocar se deshace a propósito:
          para volver a darle acceso, vuelve a añadir al invitado.
        </p>
      ) : emitido === null ? (
        <>
          <p className="mt-5 text-[13px] text-ink-soft">
            La invitación de {personName} es de antes de que guardáramos los enlaces, así que su pase no se puede volver a mostrar. Al
            generarlo, <b className="font-medium">el enlace que ya tenga deja de servir</b>: mándale el nuevo.
          </p>

          {estado.status === 'error' ? (
            <p className="mt-4 text-[13px] text-danger" role="alert">
              {estado.message}
            </p>
          ) : null}

          <form action={accion} className="mt-6 flex justify-end gap-2.5">
            <input name="eventSlug" type="hidden" value={eventSlug} />
            <input name="groupId" type="hidden" value={group.id} />
            <PanelButton onClick={cerrar}>Cerrar</PanelButton>
            <SubmitButton variant="primary" pending={pendiente} pendingLabel={'Generando…'}>{'Generar pase'}</SubmitButton>
          </form>
        </>
      ) : (
        <>
          <div
            className="mt-5 flex flex-col items-center gap-4 rounded-[18px] border border-gold/40 bg-linear-to-br from-bg-top to-bg-raised p-7 text-center shadow-float print:shadow-none"
            data-para-imprimir
            id="pase-para-imprimir"
          >
            <p className="font-mono text-[9px] tracking-[0.35em] text-gold-deep uppercase">Pase de entrada</p>
            <p className="font-mono text-[9px] tracking-[0.2em] text-ink-mute uppercase">
              {eventTitle} · {eventMeta}
            </p>
            <div className="rounded-xl border border-line-panel bg-white p-2.5">
              <PassQrSvg label={group.label} url={emitido.url} />
            </div>
            <p className="font-display text-[23px] leading-tight italic">{group.label}</p>
            <p className="text-[12px] text-ink-soft">{sitio}</p>
            <span
              aria-hidden
              className="h-px w-full bg-[repeating-linear-gradient(90deg,var(--color-line-panel-strong)_0_6px,transparent_6px_12px)]"
            />
            <p className="font-mono text-[10px] tracking-[0.15em] break-all text-ink-mute">{emitido.url}</p>
          </div>

          {estado.status === 'success' && url !== null ? (
            <p className="mt-4 text-[12px] text-ink-soft" role="status">
              Pase nuevo generado: el anterior ya no sirve.
            </p>
          ) : confirmar ? (
            <form action={accion} className="mt-4 flex flex-col gap-2 rounded-[12px] bg-bg-top p-3" role="alert">
              <input name="eventSlug" type="hidden" value={eventSlug} />
              <input name="groupId" type="hidden" value={group.id} />
              <p className="text-[12.5px] leading-[1.6]">
                El enlace y el pase actuales <b className="font-medium">dejarán de servir</b>. Úsalo solo si lo perdió.
              </p>
              <div className="flex gap-2">
                <SubmitButton pending={pendiente} pendingLabel="Generando…" variant="danger">
                  Sí, generar uno nuevo
                </SubmitButton>
                <PanelButton onClick={() => setConfirmar(false)}>Cancelar</PanelButton>
              </div>
            </form>
          ) : (
            <button className="mt-4 cursor-pointer text-[12px] text-ink-mute underline underline-offset-4 hover:text-danger" onClick={() => setConfirmar(true)} type="button">
              ¿Lo perdió? Generar un pase nuevo
            </button>
          )}

          <div className="mt-6 flex justify-end gap-2.5">
            <PanelButton onClick={cerrar}>Cerrar</PanelButton>
            <PanelButton variant="primary" onClick={printMarkedOnly}>
              Imprimir pase
            </PanelButton>
          </div>
        </>
      )}
    </dialog>
  )
}
