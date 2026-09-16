'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import type { InvitationDictionary } from '@/shared/i18n/dictionary'
import { respondByPersonAction, type RsvpActionState } from '@/app/_acciones/rsvp/actions'
import { ConfettiBurst } from '@/shared/design/ui/ConfettiBurst'

const INICIAL: RsvpActionState = { status: 'idle' }

/**
 * La confirmación de una pareja: **un toque para los dos**.
 *
 * Una pareja casi siempre viene junta o no viene, así que mandarla a marcar dos nombres es un
 * paso de más. Quien sea la excepción tiene su salida —«solo va uno»—, que abre la pantalla de
 * nombres. Debajo sigue guardándose **quién** viene, igual que en un grupo grande: el salón y
 * la cocina no distinguen parejas de familias.
 */
export function RsvpPareja({
  dictionary,
  token,
  confirmarHref,
}: {
  dictionary: InvitationDictionary
  token: string
  confirmarHref: string
}) {
  const [estado, responder, enviando] = useActionState(respondByPersonAction, INICIAL)

  if (estado.status === 'success') {
    return (
      <div className="flex flex-col items-center gap-2.5 py-4 text-center" role="status">
        <ConfettiBurst active />
        <p className="text-[28px] leading-tight font-light text-ink" style={{ fontFamily: 'var(--font-script, var(--font-display))' }}>
          {estado.responderName === null ? dictionary.successTitleAnon : dictionary.successTitle.replace('{nombre}', estado.responderName)}
        </p>
        <p className="text-[14px] leading-[1.7] text-ink-soft">{dictionary.successBody}</p>
      </div>
    )
  }

  const BOTON = 'flex-1 rounded-[var(--radius-pill)] px-5 py-3.5 font-mono text-[10px] tracking-[0.28em] uppercase transition-colors'

  return (
    <form action={responder} className="flex flex-col items-center gap-3">
      <input name="token" readOnly type="hidden" value={token} />
      <input name="extra" readOnly type="hidden" value="0" />

      {/* La respuesta viaja **en el botón que se pulsa**, con su `name` y su `value`: un campo
          oculto que cambiara un `onClick` no habría corrido cuando el formulario sale. Y quiénes
          son «todos» lo resuelve el servidor, no el navegador. */}
      <div className="flex w-full gap-2">
        <button
          className={`${BOTON} bg-[var(--color-cta)] text-[var(--color-on-cta)] disabled:opacity-50`}
          disabled={enviando}
          name="todos"
          type="submit"
          value="si"
        >
          {dictionary.bothComing}
        </button>
        <button
          className={`${BOTON} border border-[var(--color-line)] text-ink disabled:opacity-50`}
          disabled={enviando}
          name="todos"
          type="submit"
          value="no"
        >
          {dictionary.goingNoShort}
        </button>
      </div>

      {estado.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {dictionary.errors[estado.message]}
        </p>
      ) : null}

      <Link className="text-[11px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase underline-offset-4 hover:underline" href={confirmarHref}>
        {dictionary.onlyOneComing}
      </Link>
      <p className="text-[12px] leading-[1.6] text-ink-soft">{dictionary.answerOnce}</p>
    </form>
  )
}
