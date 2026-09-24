'use client'

import { useTextosDeError } from './textos-de-error'

/**
 * Aquí no cabe degradar como en la landing: una invitación sin datos no es una
 * invitación. Se remite al WhatsApp del atelier, que es la vía que siempre funciona.
 *
 * Los textos llegan del layout en el idioma del evento; sin ellos no hay nada que decir
 * en ningún idioma, y queda solo el botón.
 */
export default function InvitationError() {
  const textos = useTextosDeError()
  return (
    <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col items-center justify-center gap-5 px-6 text-center">
      {textos === null ? null : (
        <>
          <p className="font-display text-[26px] font-light text-ink">{textos.title}</p>
          <p className="text-[14px] leading-[1.7] text-ink-soft">{textos.body}</p>
        </>
      )}
      <a
        className="rounded-[var(--radius-pill)] bg-gold px-7 py-3.5 text-[12px] uppercase tracking-[var(--tracking-luxe)] text-bg-raised"
        href="/contacto/whatsapp"
        rel="noopener noreferrer"
        target="_blank"
      >
        {textos?.cta ?? 'WhatsApp'}
      </a>
    </div>
  )
}
