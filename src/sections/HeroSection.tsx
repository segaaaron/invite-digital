import type { ReactNode } from 'react'
import { Button } from '@/shared/design/ui/Button'
import { ArrowRightIcon, METRIC_ICONS, type MetricIcon } from '@/shared/design/ui/icons'
import { Reveal } from '@/shared/design/ui/Reveal'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import { HeroEnvelope } from './HeroEnvelope'

type Props = {
  dictionary: Dictionary
  slot?: ReactNode
  /**
   * Las cifras de la franja, de «La web». `null` —el admin no las ha confirmado— no pinta la
   * franja: son afirmaciones de negocio y una cifra sin respaldo resta confianza.
   */
  cifras: readonly { valor: string; etiqueta: string }[] | null
  /** Las marcas que confían, de «La web». Vacía no pinta la banda. */
  marcas: readonly string[]
}

/** El icono de cada posición de la franja: entregas, plazo, confirmaciones, alcance. */
const ICONOS: readonly MetricIcon[] = ['mail', 'clock', 'check', 'globe']

export function HeroSection({ dictionary, slot, cifras, marcas }: Props) {
  const { hero } = dictionary

  return (
    <section className="relative px-5 pb-20 pt-[clamp(132px,16vw,168px)]" id="hero">
      <div className="mx-auto grid max-w-[1180px] items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        {/* El hero aparece al cargar, no al entrar en pantalla: es lo primero que se ve y
            no puede depender de que el scroll lo cruce. */}
        <Reveal className="flex flex-col gap-7" onMount>
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
            <em className="anim-brillo bg-gradient-to-r from-gold-deep via-gold-light to-gold-deep bg-clip-text text-transparent not-italic">
              {hero.titleAccent}
            </em>
          </h1>
          <p className="max-w-[46ch] text-[15px] leading-[1.75] text-ink-soft">{hero.body}</p>
          <div className="flex flex-wrap gap-4">
            <Button href="#precios">
              {hero.ctaPrimary}
              <ArrowRightIcon className="ml-1" />
            </Button>
            <Button href="#experiencia" variant="ghost">
              {hero.ctaSecondary}
            </Button>
          </div>

          {/* La banda de confianza de la maqueta. Las marcas salen de «La web», y con la
              lista vacía **no se pinta nada**: publicar el nombre de una marca ajena
              afirmando que confía en el atelier es afirmar una relación que puede no
              existir. */}
          {marcas.length === 0 ? null : (
            <div className="mt-2 flex flex-col gap-4.5">
              <p className="text-[10px] tracking-[0.32em] text-ink-mute uppercase">{hero.trustLabel}</p>
              <ul className="flex flex-wrap items-center gap-8.5 opacity-80">
                {marcas.map((marca) => (
                  <li key={marca} className="font-display text-[22px] tracking-[0.1em] text-ink-soft">
                    {marca}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Reveal>

        <div className="relative min-h-[420px]">{slot ?? <HeroEnvelope etiqueta={hero.envelopeLabel} />}</div>
      </div>

      {/* La franja de cifras que cierra el hero en la maqueta. */}
      {cifras === null ? null : (
      <Reveal className="mx-auto mt-20 grid max-w-[1180px] grid-cols-2 gap-px bg-gold/25 min-[760px]:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]" onMount>
        {cifras.map((metric, i) => {
          const Icono = METRIC_ICONS[ICONOS[i] ?? 'check']
          return (
            <div key={metric.etiqueta} className="bg-bg-raised/75 px-4 py-5 min-[760px]:px-6.5 min-[760px]:py-7.5">
              <p className="font-display text-[34px] leading-none text-gold-deep min-[760px]:text-[44px]">{metric.valor}</p>
              <p className="mt-3 flex items-center gap-2 text-[9.5px] tracking-[0.2em] text-ink-mute uppercase min-[760px]:gap-2.5 min-[760px]:text-[10.5px] min-[760px]:tracking-[0.26em]">
                <Icono className="text-gold-deep" />
                {metric.etiqueta}
              </p>
            </div>
          )
        })}
      </Reveal>
      )}
    </section>
  )
}
