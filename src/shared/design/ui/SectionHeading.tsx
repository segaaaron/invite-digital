import type { ReactNode } from 'react'

/** `h1` en la sección que es el titular de la página (sin él la página se queda sin título principal). */
type Props = { eyebrow: string; title: ReactNode; align?: 'left' | 'center'; nivel?: 'h1' | 'h2' }

export function SectionHeading({ eyebrow, title, align = 'center', nivel: Titulo = 'h2' }: Props) {
  const alignment = align === 'center' ? 'items-center text-center' : 'items-start text-left'
  return (
    <div className={`flex flex-col gap-4 ${alignment}`}>
      <span className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep">{eyebrow}</span>
      <Titulo className="font-display text-[clamp(30px,5vw,54px)] font-light leading-[1.08] text-ink">{title}</Titulo>
      <span className="h-px w-16 bg-gold/60" aria-hidden="true" />
    </div>
  )
}
