'use client'

import { useActionState, useId } from 'react'
import { uploadProofAction, type UploadProofState } from '../actions'
import { ACCEPTED_MIMES, MAX_PROOF_BYTES } from '../domain/proof'

const INICIAL: UploadProofState = { status: 'idle' }

/**
 * La subida del comprobante.
 *
 * El `accept` del campo es **una comodidad, no una defensa**: se cambia desde las
 * herramientas del navegador en dos segundos. Quien decide qué es el fichero es el
 * servidor, mirándole los primeros bytes.
 */
export function ProofUpload({ publicRef }: { publicRef: string }) {
  const [estado, accion, pendiente] = useActionState<UploadProofState, FormData>(uploadProofAction, INICIAL)
  const id = useId()

  return (
    <form action={accion} className="flex flex-col gap-3">
      <input name="publicRef" type="hidden" value={publicRef} />

      <label className="flex flex-col gap-2" htmlFor={id}>
        <span className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
          Comprobante de la transferencia
        </span>
        <input
          accept={ACCEPTED_MIMES.join(',')}
          className="text-[13px] text-ink-soft file:mr-3 file:rounded-[var(--radius-pill)] file:border file:border-line file:bg-bg-top file:px-4 file:py-2 file:font-mono file:text-[10px] file:uppercase file:tracking-[0.25em] file:text-ink"
          id={id}
          name="proof"
          type="file"
        />
        <span className="text-[11px] text-ink-mute">
          Una foto o un PDF, hasta {Math.round(MAX_PROOF_BYTES / 1024 / 1024)} MB.
        </span>
      </label>

      {/* Con la piel de la web pública, no con la del panel: esta pantalla la ve el
          cliente desde el enlace de su pedido, y `PanelKit` es la tinta oscura del panel.
          Mismo aviso, misma forma, los colores de aquí. */}
      {estado.status === 'error' ? (
        <p
          aria-live="assertive"
          className="flex items-start gap-2.5 rounded-[12px] border border-danger/30 bg-danger/8 px-3.5 py-2.5 text-[13px] leading-[1.6] text-danger-deep"
          role="alert"
        >
          <span aria-hidden className="mt-px font-mono text-[11px]">
            !
          </span>
          <span>{estado.message}</span>
        </p>
      ) : null}
      {estado.status === 'success' ? (
        <p
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-[12px] border border-sage/35 bg-sage/10 px-3.5 py-2.5 text-[13px] leading-[1.6] text-sage-deep"
          role="status"
        >
          <span aria-hidden className="mt-px font-mono text-[11px]">
            ✓
          </span>
          <span>Comprobante recibido. Lo revisamos y te avisamos por WhatsApp.</span>
        </p>
      ) : null}

      <button
        className="w-fit cursor-pointer rounded-[var(--radius-pill)] border border-gold bg-gold/20 px-6 py-3 font-mono text-[10px] tracking-[0.25em] text-ink uppercase disabled:opacity-50"
        disabled={pendiente}
        type="submit"
      >
        {pendiente ? 'Subiendo…' : 'Enviar comprobante'}
      </button>
    </form>
  )
}
