'use client'

import { BRAND } from '@/shared/config/brand'

/**
 * Aquí no cabe degradar como en la landing: una invitación sin datos no es una
 * invitación. Se remite al WhatsApp del atelier, que es la vía que siempre funciona.
 */
export default function InvitationError() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="font-display text-[26px] font-light text-ink">No pudimos abrir la invitación</p>
      <p className="text-[14px] leading-[1.7] text-ink-soft">
        Vuelve a intentarlo en un momento. Si sigue sin abrirse, escríbenos y te confirmamos a mano.
      </p>
      <a
        className="rounded-[var(--radius-pill)] bg-gold px-7 py-3.5 text-[12px] uppercase tracking-[var(--tracking-luxe)] text-bg-raised"
        href={`https://wa.me/${BRAND.whatsapp.replace(/\D/g, '')}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        Escribir por WhatsApp
      </a>
    </div>
  )
}
