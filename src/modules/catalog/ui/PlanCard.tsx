import { Button } from '@/shared/design/ui/Button'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'
import { formatMoney } from '../domain/money'
import type { Plan } from '../domain/plan'

type Props = { plan: Plan; locale: Locale; dictionary: Dictionary; ctaHref: string }

export function PlanCard({ plan, locale, dictionary, ctaHref }: Props) {
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

      <p className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep">{plan.name}</p>
      <p className="mt-2 font-display text-[24px] font-light text-ink">{plan.tagline}</p>

      <p className="mt-6 font-display text-[44px] font-light leading-none text-ink">{formatMoney(plan.price, locale)}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{plan.price.currency}</p>

      <p className="mt-5 text-[14px] leading-[1.7] text-ink-soft">{plan.description}</p>

      <ul className="mt-7 flex flex-1 flex-col gap-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3 text-[13.5px] leading-[1.6] text-ink-soft">
            <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
            {feature}
          </li>
        ))}
      </ul>

      <Button className="mt-8 w-full" href={ctaHref} variant={plan.highlighted ? 'gold' : 'ghost'}>
        {plan.name}
      </Button>
    </article>
  )
}
