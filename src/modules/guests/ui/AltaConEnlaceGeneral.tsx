'use client'

import { useActionState, useId } from 'react'
import { altaConEnlaceGeneralAction, type AltaGeneralState } from '@/app/_acciones/guests/enlace-general-actions'
import type { OpenLinkDictionary } from '@/shared/i18n/dictionary'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

const CAMPO = 'w-full rounded-[14px] border border-line bg-bg-top/80 px-4 py-3 text-[15px] text-ink outline-none focus-visible:border-gold'
const ROTULO = 'text-[12px] tracking-[0.12em] text-ink-mute uppercase'

/** El alta desde el enlace general: nombre y acompañantes; al enviar, a su invitación personal. */
export function AltaConEnlaceGeneral({ token, textos }: { token: string; textos: OpenLinkDictionary }) {
  const [estado, accion, enviando] = useActionState<AltaGeneralState, FormData>(sinCaerse(altaConEnlaceGeneralAction, { status: 'error', code: 'fallo' }), { status: 'idle' })
  const id = useId()
  return (
    <form action={accion} className="flex flex-col gap-4">
      <input name="token" type="hidden" value={token} />
      <h2 className="font-display text-[22px] text-ink">{textos.heading}</h2>
      <label className="flex flex-col gap-2" htmlFor={`${id}-nombre`}>
        <span className={ROTULO}>{textos.name}</span>
        <input autoComplete="name" className={CAMPO} id={`${id}-nombre`} maxLength={120} minLength={2} name="nombre" required type="text" />
      </label>
      <label className="flex flex-col gap-2" htmlFor={`${id}-acompanantes`}>
        <span className={ROTULO}>{textos.companions}</span>
        <textarea className={`${CAMPO} min-h-[96px]`} id={`${id}-acompanantes`} name="acompanantes" />
        <span className="text-[12px] text-ink-mute">{textos.companionsHint}</span>
      </label>
      {estado.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {textos.errors[estado.code]}
        </p>
      ) : null}
      <button
        aria-busy={enviando || undefined}
        className="rounded-[var(--radius-pill)] bg-gold px-7 py-3.5 text-[12px] tracking-[var(--tracking-luxe)] text-[var(--color-on-gold)] uppercase disabled:opacity-60"
        disabled={enviando}
        type="submit"
      >
        {enviando ? textos.sending : textos.submit}
      </button>
    </form>
  )
}
