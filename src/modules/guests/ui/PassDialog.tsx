'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useId, useRef } from 'react'
import { resendInvitationAction, type ResendState } from '../actions'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { printMarkedOnly } from '@/shared/design/ui/print'
import { PassQrSvg } from './PassQrSvg'

const INICIAL: ResendState = { status: 'idle' }

/**
 * El «▣» de la fila: el pase de entrada imprimible de la maqueta.
 *
 * Con una diferencia que no es cosmética. En la maqueta el pase es un código guardado en
 * `localStorage` que se puede volver a enseñar cuantas veces se quiera; aquí lo que la
 * puerta lee es el **token del enlace del invitado**, y de ese token la base solo guarda
 * su SHA-256. No existe forma de redibujar un pase ya repartido: la única manera de tener
 * un QR válido en la mano es emitir uno nuevo, y emitirlo **invalida el anterior**.
 *
 * Por eso el diálogo no genera nada al abrirse. Avisa primero, y lo genera quien lo lee.
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
}: {
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

  const emitido = estado.status === 'success' ? estado : null
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
          para volver a dar acceso a este grupo, reactívalo desde la lista de grupos.
        </p>
      ) : emitido === null ? (
        <>
          <p className="mt-5 text-[13px] text-ink-soft">
            El pase de {personName} es el enlace de «{group.label}», y de ese enlace la base solo guarda su huella: no
            se puede volver a mostrar. Al generar un pase nuevo,{' '}
            <b className="font-medium">el anterior deja de servir</b> — incluido el que el invitado ya tenga—.
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
            <PanelButton variant="primary" disabled={pendiente} type="submit">
              {pendiente ? 'Generando…' : 'Generar pase'}
            </PanelButton>
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

          <p className="mt-4 text-[12px] text-ink-soft" role="status">
            Este enlace no se vuelve a mostrar. Imprímelo o cópialo antes de cerrar.
          </p>

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
