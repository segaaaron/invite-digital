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
          required
          type="file"
        />
        <span className="text-[11px] text-ink-mute">
          Una foto o un PDF, hasta {Math.round(MAX_PROOF_BYTES / 1024 / 1024)} MB.
        </span>
      </label>

      {estado.status === 'error' ? (
        <p className="text-[13px] text-gold-deep" role="alert">
          {estado.message}
        </p>
      ) : null}
      {estado.status === 'success' ? (
        <p className="text-[13px] text-sage" role="status">
          Comprobante recibido. Lo revisamos y te avisamos por WhatsApp.
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
