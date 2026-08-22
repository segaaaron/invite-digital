import { Button } from '@/shared/design/ui/Button'
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
function Check() {
  return (
    <svg aria-hidden className="mt-0.5 shrink-0" fill="none" height="15" viewBox="0 0 24 24" width="15">
      <path
        d="M4.5 12.5l4.5 4.5L19.5 6.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
        className="text-gold-deep"
      />
    </svg>
  )
}

export function PlanCard({ plan, locale, dictionary, ctaHref, ctaExternal = false, ctaLabel }: Props) {
  const cta = ctaLabel ?? dictionary.pricing.choose.replace('{plan}', plan.name)
  const frame = plan.highlighted
    ? 'border-gold bg-bg-raised shadow-[var(--shadow-lift)] md:-translate-y-4'
    : 'border-[var(--color-line)] bg-bg-raised/70'

  return (
    <article className={`relative flex flex-col rounded-[var(--radius-card)] border p-8 backdrop-blur-md ${frame}`}>
      {plan.highlighted ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-[var(--radius-pill)] bg-gold px-4 py-1 text-[10px] uppercase tracking-[var(--tracking-luxe)] text-bg-raised">
          {dictionary.pricing.mostChosen}
        </span>
      ) : null}

      {/* El nombre del plan es el encabezado de la tarjeta, como en la maqueta: era un
          párrafo, y una tarjeta de plan sin encabezado no existe para quien navega por
          títulos. */}
      <h3 className="font-mono text-[13px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase">{plan.name}</h3>
      <p className="mt-2 font-display text-[24px] font-light text-ink">{plan.tagline}</p>

      <p className="mt-6 flex items-baseline gap-2">
        <span className="font-display text-[44px] leading-none font-light text-ink">
          {formatMoney(plan.price, locale)}
        </span>
        <span className="text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
          {plan.price.currency}
        </span>
      </p>

      <p className="mt-5 text-[14px] leading-[1.7] text-ink-soft">{plan.description}</p>

      <span aria-hidden className="mt-7 block h-px bg-[var(--color-line)]" />

      <ul className="mt-6 flex flex-1 flex-col gap-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3 text-[13.5px] leading-[1.6] text-ink-soft">
            <Check />
            {feature}
          </li>
        ))}
      </ul>

      <Button className="mt-8 w-full" external={ctaExternal} href={ctaHref} variant={plan.highlighted ? 'gold' : 'ghost'}>
        {cta}
        <span aria-hidden className="ml-1">
          →
        </span>
      </Button>
    </article>
  )
}
