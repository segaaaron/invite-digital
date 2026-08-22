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
          {/* El kicker de la maqueta abre con una línea dorada que se apaga hacia la derecha. */}
          <span className="flex items-center gap-3.5">
            <span
              aria-hidden
              className="block h-px w-13 bg-linear-to-r from-gold-deep to-transparent"
            />
            <span className="text-[11px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase">{hero.eyebrow}</span>
          </span>
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
            <Button href="#precios">
              {hero.ctaPrimary}
              <span aria-hidden className="ml-1">
                →
              </span>
            </Button>
            <Button href="#experiencia" variant="ghost">
              {hero.ctaSecondary}
            </Button>
          </div>

          {/* La banda de confianza de la maqueta. Los tres sellos son marcadores hasta
              que el usuario dé los suyos: no se publica el nombre de una marca ajena
              afirmando que confía en el atelier. */}
          <div className="mt-2 flex flex-col gap-4.5">
            <p className="text-[10px] tracking-[0.32em] text-ink-mute uppercase">{hero.trustLabel}</p>
            <ul className="flex flex-wrap items-center gap-8.5 opacity-80">
              {hero.trustBrands.map((marca) => (
                <li key={marca} className="font-display text-[22px] tracking-[0.1em] text-ink-soft">
                  {marca}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <div className="relative min-h-[420px]">{slot ?? <HeroEnvelope />}</div>
      </div>

      {/* La franja de cifras que cierra el hero en la maqueta. */}
      <Reveal className="mx-auto mt-20 grid max-w-[1180px] grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-px bg-gold/25">
        {hero.metrics.map((metric) => (
          <div key={metric.label} className="bg-bg-raised/75 px-6.5 py-7.5">
            <p className="font-display text-[44px] leading-none text-gold-deep">{metric.value}</p>
            <p className="mt-3 flex items-center gap-2.5 text-[10.5px] tracking-[0.26em] text-ink-mute uppercase">
              <span aria-hidden>{metric.icon}</span>
              {metric.label}
            </p>
          </div>
        ))}
      </Reveal>
    </section>
  )
}
