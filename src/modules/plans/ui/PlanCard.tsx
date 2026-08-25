import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import type { Allowance, PlanFeature } from '../domain/allowance'
import { hasFeature } from '../domain/allowance'

const NOMBRES: ReadonlyArray<{ feature: PlanFeature; label: string }> = [
  { feature: 'seating', label: 'Mesas y plano del salón' },
  { feature: 'registry', label: 'Mesa de regalos y fondos' },
  { feature: 'checkin', label: 'Modo puerta con QR' },
]

/**
 * Una tarjeta por plan, con las tres funciones **siempre** listadas y su respuesta al
 * lado. Enseñar solo lo incluido obligaría a comparar tarjetas para deducir lo que
 * falta, que es justo lo que hay que decidir aquí.
 */
/**
 * El precio, en la moneda del catálogo. Se compone a partir de la cadena decimal y nunca
 * de un `parseFloat` sobre los centavos: `1234.5 * 100` no vuelve a dar 123450.
 */
function formatPrice(cents: number, currency: string): string {
  const entero = Math.trunc(cents / 100)
  const decimal = String(Math.abs(cents % 100)).padStart(2, '0')
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency, minimumFractionDigits: 2 }).format(
    Number(`${entero}.${decimal}`),
  )
}

export type PlanPrice = {
  readonly cents: number
  readonly annualCents: number | null
  readonly currency: string
}

/**
 * ¿Este plan tiene precio anual?
 *
 * No se anuncia porcentaje de ahorro. El «AHORRA 17 %» de la maqueta comparaba el precio
 * **por evento** multiplicado por doce con el anual: solo sería cierto para quien celebre
 * doce bodas al año, y prometer un ahorro que nadie va a tener es publicidad engañosa. Se
 * enseñan los dos precios y que cada cual haga su cuenta.
 */
export function hasAnnual(price: PlanPrice): boolean {
  return price.annualCents !== null
}

export function PlanCard({
  plan,
  current,
  price,
  billing = 'once',
  changeHref,
}: {
  plan: Allowance
  current: boolean
  price?: PlanPrice | undefined
  /** `once` es el pago por evento; `annual` solo existe si el plan tiene precio anual. */
  billing?: 'once' | 'annual' | undefined
  /** Adónde lleva «Cambiar a…». Sin él la tarjeta solo informa. */
  changeHref?: string | undefined
}) {
  return (
    <article
      className={`flex flex-col gap-4 rounded-[18px] border bg-linear-to-b from-bg-top to-white p-6 shadow-card ${
        current ? 'border-gold' : 'border-line-panel'
      }`}
      aria-label={`Plan ${plan.planSlug}`}
    >
      <header className="flex flex-col gap-1">
        {current ? (
          <p className="font-mono text-[9px] tracking-[0.35em] text-gold-deep uppercase">Plan actual</p>
        ) : null}
        <h3 className="font-display text-[22px] font-light italic text-ink">{plan.planSlug}</h3>
      </header>

      {price === undefined ? null : (
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-display text-[34px] leading-none font-light text-ink [font-variant-numeric:lining-nums]">
            {formatPrice(billing === 'annual' && price.annualCents !== null ? price.annualCents : price.cents, price.currency)}
          </span>
          <span className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
            {billing === 'annual' && price.annualCents !== null ? 'al año' : 'por evento'}
          </span>
        </p>
      )}

      <p className="text-[13px] text-ink-mute">
        Grupos de invitados:{' '}
        <strong className="font-normal text-ink">
          {plan.maxGuestGroups === null ? 'sin límite' : `hasta ${plan.maxGuestGroups}`}
        </strong>
      </p>

      <ul className="flex flex-col">
        {NOMBRES.map(({ feature, label }) => (
          <li
            aria-label={label}
            className="flex items-center justify-between gap-3 border-b border-line-panel py-2.5 text-[13px] text-ink-mute last:border-none"
            key={feature}
          >
            <span>{label}</span>
            <span className={hasFeature(plan, feature) ? 'text-ink' : 'text-ink-mute/60'}>
              {hasFeature(plan, feature) ? 'Sí' : 'No'}
            </span>
          </li>
        ))}
      </ul>

      {/* El pie de la maqueta: una llamada por tarjeta, y la actual sin nada que pulsar. */}
      <div className="mt-auto pt-2">
        {current ? (
          <p className="rounded-[var(--radius-pill)] border border-line-panel py-2.5 text-center font-mono text-[10px] tracking-[0.25em] text-ink-mute uppercase">
            Plan actual
          </p>
        ) : changeHref === undefined ? null : (
          <PanelButton className="w-full" href={changeHref} variant="primary">
            Cambiar a {plan.planSlug}
          </PanelButton>
        )}
      </div>
    </article>
  )
}
