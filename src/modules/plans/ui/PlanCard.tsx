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
}: {
  plan: Allowance
  current: boolean
  price?: PlanPrice | undefined
  /** `once` es el pago por evento; `annual` solo existe si el plan tiene precio anual. */
  billing?: 'once' | 'annual' | undefined
}) {
  return (
    <article
      className={`flex flex-col gap-4 rounded-[18px] border p-6 ${current ? 'border-gold' : 'border-line'}`}
      aria-label={`Plan ${plan.planSlug}`}
    >
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[19px] font-light text-ink">{plan.planSlug}</h3>
        {current ? (
          <span className="rounded-full border border-gold px-3 py-1 font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep">
            Plan actual
          </span>
        ) : null}
      </header>

      {price === undefined ? null : (
        <p className="flex items-baseline gap-2">
          <span className="font-display text-[30px] leading-none font-light text-ink">
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

      <ul className="flex flex-col gap-2">
        {NOMBRES.map(({ feature, label }) => (
          <li aria-label={label} className="flex items-center justify-between gap-3 text-[13px] text-ink-mute" key={feature}>
            <span>{label}</span>
            <span className={hasFeature(plan, feature) ? 'text-ink' : 'text-ink-mute/60'}>
              {hasFeature(plan, feature) ? 'Sí' : 'No'}
            </span>
          </li>
        ))}
      </ul>
    </article>
  )
}
