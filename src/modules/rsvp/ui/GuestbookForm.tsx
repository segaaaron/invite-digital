'use client'

import { useActionState, useId } from 'react'
import type { InvitationDictionary } from '@/shared/i18n/dictionary'
import { firmarLibroAction, type FirmaState } from '@/app/_acciones/rsvp/actions'

type Props = {
  dictionary: InvitationDictionary
  token: string
  /** Lo que ya escribió en el libro, o `null` si aún no firmó. */
  firmado: string | null
  /** El rótulo del botón, si el diseño no dice «ENVIAR MIS DESEOS»: los XV dicen «FIRMAR EL LIBRO». */
  boton?: string | undefined
  /** El botón de `Firma3D` (XV): píldora rellena del acento, a su ancho, no la barra con filete. */
  relleno?: boolean | undefined
}

const INICIAL: FirmaState = { status: 'idle' }

/**
 * El libro de firmas: un campo de texto y «ENVIAR MIS DESEOS» (V4; antes «FIRMAR LIBRO»).
 *
 * En la maqueta es su propia sección, con su titular en caligrafía, y no una casilla más
 * del formulario de confirmación. Se firma **después de confirmar** y una vez: el mensaje se
 * guarda en la respuesta ya dada (`firmarLibroAction`), sin tocar cuántos vienen.
 */
export function GuestbookForm({ dictionary, token, firmado, boton, relleno = false }: Props) {
  const [estado, formAction, isPending] = useActionState(firmarLibroAction, INICIAL)
  const campoId = useId()

  if (estado.status === 'success' || firmado !== null) {
    return (
      <p aria-live="polite" className="py-4 text-center text-[14px] text-ink-soft" role="status">
        {firmado === null ? dictionary.successBody : <em className="font-display text-[16px] text-ink">«{firmado}»</em>}
      </p>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input name="token" type="hidden" value={token} readOnly />

      {/* El nombre del campo es su propia frase («Deja unas palabras…»): el libro no es la
          confirmación, y «Mensaje para los anfitriones» se leía como otro formulario. */}
      <textarea
        aria-label={dictionary.guestbookPlaceholder}
        className="min-h-[72px] w-full resize-none rounded-[var(--libro-radio,6px)] border border-[var(--color-line)] bg-transparent p-3 font-display text-[15px] italic text-ink outline-none"
        id={campoId}
        maxLength={500}
        name="message"
        // Vacío no se envía (lo frena el navegador), pero el botón no se ve apagado: en la maqueta está listo.
        required
        placeholder={dictionary.guestbookPlaceholder}
        rows={3}
      />

      {estado.status !== 'error' ? null : (
        <p className="text-[13px] text-danger" role="alert">
          {dictionary.errors[estado.message]}
        </p>
      )}

      <button
        className={
          relleno
            ? 'mt-2 self-center rounded-full bg-[var(--color-cta)] px-[22px] py-3 [font-family:var(--font-dm-sans)] text-[11px] font-bold tracking-[0.18em] text-[var(--color-on-cta)] uppercase disabled:opacity-60'
            : 'w-full rounded-[var(--libro-radio,4px)] border border-[var(--color-line)] py-3 [font-family:var(--libro-letra,var(--font-display))] text-[length:var(--libro-fs,11px)] font-semibold tracking-[var(--libro-tracking,0.2em)] text-ink uppercase disabled:opacity-60'
        }
        disabled={isPending}
        type="submit"
      >
        {isPending ? dictionary.sending : (boton ?? dictionary.signBook)}
      </button>
    </form>
  )
}
