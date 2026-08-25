import { buildWhatsAppLink, whatsAppPlanMessage } from '@/modules/leads'
import { Reveal } from '@/shared/design/ui/Reveal'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'
import { formatMoney } from '../domain/money'
import type { Plan } from '../domain/plan'
import { PlanCard } from './PlanCard'

type Props = { plans: readonly Plan[]; locale: Locale; dictionary: Dictionary }

export function PricingSection({ plans, locale, dictionary }: Props) {
  const { pricing } = dictionary

  // El plan más caro no se compra de un clic: en la maqueta ese botón agenda una llamada.
  const masCaro = plans.reduce<Plan | null>(
    (mayor, plan) => (mayor && mayor.price.cents >= plan.price.cents ? mayor : plan),
    null,
  )

  return (
    <section aria-labelledby="pricing-title" className="px-6 py-24" id="precios">
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading eyebrow={pricing.eyebrow} title={<span id="pricing-title">{pricing.title}</span>} />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {plans.map((plan, index) => {
            // El más caro agenda una llamada, como en la maqueta: se cotiza, no se
            // compra de un clic. Los demás abren el pedido, que desde el Plan B existe:
            // dejarlos en WhatsApp sería tener el flujo construido y sin puerta.
            const agendaLlamada = plan.id === masCaro?.id

            return (
            <Reveal key={plan.id} delay={index * 0.08}>
              <PlanCard
                ctaExternal={agendaLlamada}
                ctaHref={
                  agendaLlamada
                    ? buildWhatsAppLink({
                        message: whatsAppPlanMessage({ name: plan.name, price: formatMoney(plan.price, locale) }, locale),
                      })
                    : `/${locale}/pedido/${plan.slug}`
                }
                ctaLabel={agendaLlamada ? pricing.bookCall : pricing.choose.replace('{plan}', plan.name)}
                dictionary={dictionary}
                locale={locale}
                plan={plan}
              />
            </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
