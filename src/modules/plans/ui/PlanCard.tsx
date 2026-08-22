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
export function PlanCard({ plan, current }: { plan: Allowance; current: boolean }) {
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
