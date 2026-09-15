import { LegalText } from '@/shared/design/ui/LegalText'

export { LegalText }

export function LegalPage({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <article className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-6 pt-36 pb-24">
      <h1 className="font-display text-[clamp(34px,5vw,48px)] font-light text-ink">{titulo}</h1>
      <LegalText texto={texto} />
    </article>
  )
}

/**
 * El aviso bajo un formulario que pide datos. Solo aparece con la política publicada: un
 * enlace a una página que no existe es peor que no enlazar.
 */
export function PrivacyNotice({ href, texto, enlace }: { href: string | null; texto: string; enlace: string }) {
  if (href === null) return null
  return (
    <p className="text-[12px] leading-[1.6] text-ink-mute">
      {texto}{' '}
      <a className="text-gold-deep underline underline-offset-2" href={href}>
        {enlace}
      </a>
      .
    </p>
  )
}
