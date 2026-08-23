import { notFound } from 'next/navigation'
import { events, plans } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import type { Allowance } from '@/modules/plans'
import { BillingToggle } from '@/modules/plans/ui/BillingToggle'
import { PlanChangeForm } from '@/modules/plans/ui/PlanChangeForm'
import { PlanDecisionForms } from '@/modules/plans/ui/PlanDecisionForms'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Plan' }

// El plan cambia en cuanto el atelier aplica una solicitud: esta página no se cachea.
export const dynamic = 'force-dynamic'


export default async function PlanPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession()
  const { slug } = await params

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const capacidad = await plans.allowanceFor(event.value.id)
  if (isErr(capacidad)) throw new Error(capacidad.error.detail)

  const catalogo = await plans.listActive()
  const pendiente = await plans.pendingChange(event.value.id)

  const tarjetas: Array<{
    id: string
    allowance: Allowance
    price?: { cents: number; annualCents: number | null; currency: string } | undefined
  }> = catalogo.map((plan) => ({
    id: plan.id,
    price:
      plan.priceCents === undefined
        ? undefined
        : { cents: plan.priceCents, annualCents: plan.priceAnnualCents ?? null, currency: 'BOB' },
    allowance: {
      planSlug: plan.slug,
      maxGuestGroups: plan.maxGuestGroups,
      seating: plan.includesSeating,
      registry: plan.includesRegistry,
      checkin: plan.includesCheckin,
    },
  }))

  const actual = capacidad.value.planSlug

  return (
    <>
      <PanelHeader kicker="Cuenta" meta={event.value.title} title="Tu plan" />

      <div className="flex flex-col gap-4.5">
        <PanelCard title="Planes">
          {/* El conmutador solo aparece si algún plan tiene precio anual cargado: hoy se
              cobran una vez por evento, y pintar una suscripción que nadie vende haría
              esperar una factura mensual que no existe. */}
          <BillingToggle
            plans={tarjetas.map((tarjeta) => ({
              id: tarjeta.id,
              current: tarjeta.allowance.planSlug === actual,
              allowance: tarjeta.allowance,
              price: tarjeta.price,
            }))}
          />
        </PanelCard>

        <PanelCard title="Cambio de plan">
          {isErr(pendiente) || pendiente.value === null ? (
            // No hay cobro en línea: esto registra la petición, no la cobra ni la aplica.
            <PlanChangeForm
              eventId={event.value.id}
              eventSlug={event.value.slug}
              options={tarjetas
                .filter((t) => t.allowance.planSlug !== actual)
                .map((t) => ({ id: t.id, slug: t.allowance.planSlug }))}
            />
          ) : (
            <div aria-label="Solicitud pendiente" className="flex flex-col gap-4">
              <p className="text-[14px] text-ink">
                Solicitud sin resolver: pasar al plan{' '}
                <strong className="font-normal">{pendiente.value.requestedPlanSlug}</strong>.
              </p>
              {pendiente.value.note === null ? null : (
                <p className="text-[13px] text-ink-mute">«{pendiente.value.note}»</p>
              )}
              <p className="text-[12px] text-ink-mute">
                El cobro se acuerda fuera del sistema. Aplícala cuando esté pagada; el plan del evento cambia en ese
                momento.
              </p>
              <PlanDecisionForms eventSlug={event.value.slug} requestId={pendiente.value.id} />
            </div>
          )}
        </PanelCard>
      </div>
    </>
  )
}
