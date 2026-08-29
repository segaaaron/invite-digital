'use client'

import { useActionState, useId, useRef } from 'react'
import type { InvitationDictionary } from '@/shared/i18n/dictionary'
import { type GuestPhotoState, uploadGuestPhotoAction } from '../actions'

const INICIAL: GuestPhotoState = { status: 'idle', message: '' }

type Props = {
  readonly dictionary: InvitationDictionary
  readonly token: string
  /** Cuántas le quedan por subir a este grupo. A cero, el campo se cierra. */
  readonly remaining: number
}

/**
 * El campo con el que un invitado sube una fotografía de la boda.
 *
 * Se envía **al elegir el archivo**, sin un botón de «subir» aparte: en un teléfono, entre
 * la cámara y el envío hay dos toques más y una pantalla de confirmación que nadie pide.
 * El `<input>` va oculto tras su `<label>`, que es la forma de que el control del sistema
 * se abra con un solo toque y siga siendo alcanzable con teclado.
 *
 * El tope y el tipo los decide el servidor, no esto: `accept` y la cuenta de aquí son
 * cortesía —un teléfono que ofrece solo fotos—, y quien mande el POST a mano no las ve.
 */
export function GuestPhotoUpload({ dictionary, token, remaining }: Props) {
  const [estado, formAction, enviando] = useActionState(uploadGuestPhotoAction, INICIAL)
  const formulario = useRef<HTMLFormElement>(null)
  const campoId = useId()

  if (remaining <= 0) {
    return (
      <p className="text-[13px] leading-[1.7] text-ink-soft" role="status">
        {dictionary.photoErrors.too_many}
      </p>
    )
  }

  return (
    <form action={formAction} className="flex flex-col items-center gap-3" ref={formulario}>
      <input name="token" type="hidden" value={token} readOnly />

      <label
        className="cursor-pointer rounded-[var(--radius-pill)] bg-gold px-6 py-3 font-mono text-[10px] font-bold tracking-[0.15em] text-[var(--color-on-gold)] uppercase"
        htmlFor={campoId}
      >
        {enviando ? dictionary.photosSending : dictionary.photosPick}
      </label>
      <input
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="sr-only"
        disabled={enviando}
        id={campoId}
        name="file"
        onChange={() => formulario.current?.requestSubmit()}
        type="file"
      />

      <p className="font-mono text-[10px] tracking-[0.2em] text-ink-mute uppercase">
        {dictionary.photosLeft.replace('{n}', String(remaining))}
      </p>

      {estado.status === 'error' && estado.message !== '' ? (
        <p className="text-[12px] text-danger" role="alert">
          {dictionary.photoErrors[estado.message]}
        </p>
      ) : null}
    </form>
  )
}
