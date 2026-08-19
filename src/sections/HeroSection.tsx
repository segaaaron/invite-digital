import type { ReactNode } from 'react'
import { Button } from '@/shared/design/ui/Button'
import { Reveal } from '@/shared/design/ui/Reveal'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import { HeroEnvelope } from './HeroEnvelope'

type Props = { dictionary: Dictionary; slot?: ReactNode }

export function HeroSection({ dictionary, slot }: Props) {
  const { hero } = dictionary

  return (
    <section className="relative px-5 pb-20 pt-[clamp(132px,16vw,168px)]" id="hero">
      <div className="mx-auto grid max-w-[1180px] items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <Reveal className="flex flex-col gap-7">
          <span className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep">{hero.eyebrow}</span>
          <h1 className="font-display text-[clamp(42px,7.4vw,92px)] font-light leading-[0.98] text-ink">
            {hero.titleLine1}
            <br />
            {hero.titleLine2}
            <br />
            <em className="bg-gradient-to-r from-gold-deep via-gold-light to-gold-deep bg-clip-text not-italic text-transparent">
              {hero.titleAccent}
            </em>
          </h1>
          <p className="max-w-[46ch] text-[15px] leading-[1.75] text-ink-soft">{hero.body}</p>
          <div className="flex flex-wrap gap-4">
            <Button href="#contacto">{hero.ctaPrimary}</Button>
            <Button href="#experiencia" variant="ghost">
              {hero.ctaSecondary}
            </Button>
          </div>
        </Reveal>

        <div className="relative min-h-[420px]">{slot ?? <HeroEnvelope />}</div>
      </div>
    </section>
  )
}
