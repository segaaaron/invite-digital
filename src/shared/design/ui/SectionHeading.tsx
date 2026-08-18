import type { ReactNode } from 'react'

type Props = { eyebrow: string; title: ReactNode; align?: 'left' | 'center' }

export function SectionHeading({ eyebrow, title, align = 'center' }: Props) {
  const alignment = align === 'center' ? 'items-center text-center' : 'items-start text-left'
  return (
    <div className={`flex flex-col gap-4 ${alignment}`}>
      <span className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep">{eyebrow}</span>
      <h2 className="font-display text-[clamp(30px,5vw,54px)] font-light leading-[1.08] text-ink">{title}</h2>
      <span className="h-px w-16 bg-gold/60" aria-hidden="true" />
    </div>
  )
}
