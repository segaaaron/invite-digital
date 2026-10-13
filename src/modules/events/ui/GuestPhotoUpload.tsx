'use client'

import { useActionState, useId, useRef } from 'react'
import type { InvitationDictionary } from '@/shared/i18n/dictionary'
import { type GuestPhotoState, uploadGuestPhotoAction } from '@/app/_acciones/events/actions'
import { reducirEnElCampo } from '@/shared/design/ui/reducir-foto'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

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
const SUBIR_SIN_CAERSE = sinCaerse(uploadGuestPhotoAction, { status: 'error', message: 'storage_failure' })

export function GuestPhotoUpload({ dictionary, token, remaining }: Props) {
  // Una subida que falla en el servidor sale como aviso, no como pantalla de error delante del invitado.
  const [estado, formAction, enviando] = useActionState(SUBIR_SIN_CAERSE, INICIAL)
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
        className="cursor-pointer min-w-[var(--fotos-min,0px)] rounded-[var(--radius-pill)] border-[length:var(--fotos-borde,0px)] text-center whitespace-nowrap border-[var(--fotos-linea,transparent)] px-[var(--fotos-px,24px)] py-[var(--fotos-py,12px)] [font-family:var(--fotos-letra,var(--font-mono))] text-[length:var(--fotos-fs,10px)] font-bold tracking-[var(--fotos-tracking,0.15em)] uppercase bg-[var(--fotos-fondo,var(--color-gold))] text-[var(--fotos-tinta,var(--color-on-gold))]"
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
        // La foto del celular se reduce antes de subirla: con datos móviles sube en segundos, no en minutos.
        onChange={(e) => void reducirEnElCampo(e.currentTarget).then(() => formulario.current?.requestSubmit())}
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
