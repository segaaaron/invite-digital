import type { ReactNode } from 'react'
import { Reveal } from '@/shared/design/ui/Reveal'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'
import { formatMoney } from '../domain/money'
import type { Plan } from '../domain/plan'
import { PlanCard } from './PlanCard'

type Props = {
  plans: readonly Plan[]
  locale: Locale
  dictionary: Dictionary
  /**
   * El diseño que el cliente venía mirando, si llegó aquí desde el escaparate.
   *
   * Viaja hasta el pedido para que lo que eligió con los ojos sea lo que acabe recibiendo
   * el invitado. Sin esto, el catálogo y la compra eran dos caminos que no se tocaban.
   */
  modelo?: string | null
  /** El código de recomendación que llegó en el enlace (`?ref=`), para que llegue al pedido. */
  referido?: string | null
  /** La reserva de cada plan por su `slug` (centavos), si tiene reserva fija. */
  reservas?: Readonly<Record<string, number>>
  /** La tabla comparativa, debajo de las tarjetas. La compone quien lee los límites. */
  comparativa?: ReactNode
}

export function PricingSection({ plans, locale, dictionary, modelo = null, referido = null, reservas = {}, comparativa = null }: Props) {
  const consulta = new URLSearchParams({ ...(modelo === null ? {} : { modelo }), ...(referido === null || referido === '' ? {} : { ref: referido }) }).toString()
  const { pricing } = dictionary

  return (
    <section aria-labelledby="pricing-title" className="px-6 py-24" id="precios">
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading eyebrow={pricing.eyebrow} title={<span id="pricing-title">{pricing.title}</span>} />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {plans.map((plan, index) => {
            // Todos se reservan igual (documento de cambios del 30 sep): el pedido guarda la referencia
            // y desde ahí se sigue por WhatsApp. Ya no hay plan que «agende una llamada».
            const reserva = reservas[plan.slug]
            return (
            <Reveal key={plan.id} delay={index * 0.08}>
              <PlanCard
                ctaHref={`/${locale}/pedido/${plan.slug}${consulta === '' ? '' : `?${consulta}`}`}
                ctaLabel={pricing.choose.replace('{plan}', plan.name)}
                reserva={reserva === undefined ? null : pricing.reserve.replace('{monto}', formatMoney({ cents: reserva, currency: plan.price.currency }, locale))}
                dictionary={dictionary}
                locale={locale}
                plan={plan}
              />
            </Reveal>
            )
          })}
        </div>
        {comparativa}
      </div>
    </section>
  )
}
