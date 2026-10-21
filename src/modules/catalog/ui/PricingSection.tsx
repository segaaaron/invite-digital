import type { ReactNode } from 'react'
import { Reveal } from '@/shared/design/ui/Reveal'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'
import type { Plan } from '../domain/plan'
import { EscaleraDePlanes } from './EscaleraDePlanes'
import { conMonto, Monto } from './Monto'
import { PlanCard } from './PlanCard'
import { rutaDe } from '@/shared/i18n/rutas'

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
  // La reserva de la caja: la del plan destacado, o la menor si no la tiene.
  const destacado = plans.find((p) => p.highlighted) ?? plans[0]!
  const montos = Object.values(reservas)
  const reservaMinima =
    montos.length === 0 ? null : { cents: reservas[destacado.slug] ?? Math.min(...montos), currency: destacado.price.currency }

  return (
    <section aria-labelledby="pricing-title" className="px-6 py-24" id="precios">
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading eyebrow={pricing.eyebrow} title={<span id="pricing-title">{pricing.title}</span>} />

        {/* **Sin selector de moneda** (20 oct, decisión del usuario): los precios se enseñan en bolivianos,
            que es lo que se cobra. El precio en dólares sigue guardado en cada plan por si vuelve; lo que
            se quitó es el conmutador, no el dato. */}

        {/* El aviso de la promoción, solo si algún plan la tiene puesta en la base (0100). */}
        {plans.some((p) => p.priceBeforeCents !== null && p.priceBeforeCents > p.price.cents) ? (
          <div className="mt-6 flex flex-col items-center gap-2 text-center">
            <span className="rounded-[var(--radius-pill)] border border-gold/45 bg-pill-pending px-4 py-1.5 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase">
              {pricing.launchBadge}
            </span>
            <p className="text-[13.5px] text-ink-soft">{pricing.launchNote}</p>
          </div>
        ) : null}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {plans.map((plan, index) => {
            // Todos se reservan igual (documento de cambios del 30 sep): el pedido guarda la referencia
            // y desde ahí se sigue por WhatsApp. Ya no hay plan que «agende una llamada».
            const reserva = reservas[plan.slug]
            return (
            <Reveal key={plan.id} delay={index * 0.08}>
              <PlanCard
                ctaHref={rutaDe(locale, 'pedido', `/${plan.slug}${consulta === '' ? '' : `?${consulta}`}`)}
                ctaLabel={pricing.choose.replace('{plan}', plan.name)}
                reserva={reserva === undefined ? null : conMonto(pricing.reserve, <Monto cents={reserva} locale={locale} />)}
                dictionary={dictionary}
                locale={locale}
                plan={plan}
                anterior={index === 0 ? null : (plans[index - 1]?.name ?? null)}
              />
            </Reveal>
            )
          })}
        </div>

        {/* La reserva (V4): cuánto, cuándo se paga el resto y los tres pasos. */}
        {reservaMinima === null ? null : (
          <div className="mt-16 flex flex-col gap-6 rounded-[var(--radius-card)] bg-ink p-8 text-bg-raised md:flex-row md:items-center md:justify-between md:p-10">
            <div className="max-w-[640px]">
              <h3 className="font-display text-[26px] leading-tight font-light">
                {conMonto(pricing.reserveBox.title, <Monto cents={reservaMinima.cents} locale={locale} />)}
              </h3>
              <p className="mt-3 text-[14px] leading-[1.7] text-bg-sunken/85">{pricing.reserveBox.body}</p>
              <ol className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-bg-sunken">
                {pricing.reserveBox.steps.map((paso, i) => (
                  <li key={paso}>
                    <b className="mr-2 font-display text-[18px] font-normal text-gold-light [font-variant-numeric:lining-nums]">0{i + 1}</b>
                    {paso}
                  </li>
                ))}
              </ol>
            </div>
            <a
              className="shrink-0 rounded-[var(--radius-pill)] bg-linear-to-r from-gold-deep via-gold-light to-gold-deep px-7 py-3.5 text-center font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink uppercase"
              href={rutaDe(locale, 'pedido', `/${destacado.slug}${consulta === '' ? '' : `?${consulta}`}`)}
            >
              {pricing.reserveBox.cta}
            </a>
          </div>
        )}

        {plans.length === 3 ? <EscaleraDePlanes planes={plans.map((p) => p.name)} textos={pricing.ladder} /> : null}

        {comparativa}
      </div>
    </section>
  )
}

