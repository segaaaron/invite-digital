import { Button } from '@/shared/design/ui/Button'
import { ArrowRightIcon } from '@/shared/design/ui/icons'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'
import { formatMoney } from '../domain/money'
import type { Plan } from '../domain/plan'

type Props = {
  plan: Plan
  locale: Locale
  dictionary: Dictionary
  ctaHref: string
  ctaExternal?: boolean
  /** Texto del botón. Lo decide quien conoce el catálogo entero, no la tarjeta. */
  ctaLabel?: string
}

/** El check dorado de la maqueta. Un punto no dice «incluido»; una marca sí. */
function Check({ gold = false }: { gold?: boolean }) {
  return (
    <svg
      aria-hidden
      className={`mt-0.5 shrink-0 ${gold ? 'text-gold-light' : 'text-gold-deep'}`}
      fill="none"
      height="15"
      viewBox="0 0 24 24"
      width="15"
    >
      <path d="M4.5 12.5l4.5 4.5L19.5 6.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  )
}

export function PlanCard({ plan, locale, dictionary, ctaHref, ctaExternal = false, ctaLabel }: Props) {
  const cta = ctaLabel ?? dictionary.pricing.choose.replace('{plan}', plan.name)
  // El plan más elegido es una tarjeta oscura y elevada, como en la maqueta: es lo que
  // separa «recomendado» de «uno más de la fila». Un borde dorado no se ve a un metro.
  const destacado = plan.highlighted
  const frame = destacado
    ? 'border-transparent bg-ink text-bg-raised shadow-[0_40px_90px_-40px_rgb(60_44_14/0.75)] md:-translate-y-5'
    : 'border-[var(--color-line)] bg-bg-raised'

  return (
    <article className={`relative flex flex-col rounded-[var(--radius-card)] border p-8 backdrop-blur-md ${frame}`}>
      {plan.highlighted ? (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-[var(--radius-pill)] bg-linear-to-r from-gold-deep via-gold-light to-gold-deep px-5 py-1.5 font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink uppercase shadow-[var(--shadow-float)]">
          {dictionary.pricing.mostChosen}
        </span>
      ) : null}

      {/* El nombre del plan es el encabezado de la tarjeta, como en la maqueta: era un
          párrafo, y una tarjeta de plan sin encabezado no existe para quien navega por
          títulos. */}
      <h3
        className={`font-display text-[32px] leading-none font-light tracking-[0.08em] uppercase ${
          destacado ? 'text-bg-raised' : 'text-ink'
        }`}
      >
        {plan.name}
      </h3>
      <p
        className={`mt-3 font-mono text-[10px] tracking-[var(--tracking-luxe)] uppercase ${
          destacado ? 'text-bg-sunken/80' : 'text-ink-mute'
        }`}
      >
        {plan.tagline}
      </p>

      <p className="mt-7 flex items-baseline gap-2">
        <span className={`font-display text-[46px] leading-none font-light ${destacado ? 'text-gold-light' : 'text-gold-deep'}`}>
          {formatMoney(plan.price, locale)}
        </span>
        <span className={`text-[10px] tracking-[var(--tracking-luxe)] uppercase ${destacado ? 'text-bg-sunken/70' : 'text-ink-mute'}`}>
          {plan.price.currency}
        </span>
      </p>

      <p className={`mt-5 text-[14px] leading-[1.7] ${destacado ? 'text-bg-sunken/90' : 'text-ink-soft'}`}>
        {plan.description}
      </p>

      <span aria-hidden className={`mt-7 block h-px ${destacado ? 'bg-gold/40' : 'bg-[var(--color-line)]'}`} />

      <ul className="mt-6 flex flex-1 flex-col gap-3">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className={`flex gap-3 text-[13.5px] leading-[1.6] ${destacado ? 'text-bg-sunken' : 'text-ink-soft'}`}
          >
            <Check gold={destacado} />
            {feature}
          </li>
        ))}
      </ul>

      {/* Texto a la izquierda y flecha al filo, como la maqueta. */}
      <Button
        className="mt-9 flex w-full items-center justify-between"
        external={ctaExternal}
        href={ctaHref}
        variant={destacado ? 'gold' : 'ghost'}
      >
        {cta}
        <ArrowRightIcon />
      </Button>
    </article>
  )
}
