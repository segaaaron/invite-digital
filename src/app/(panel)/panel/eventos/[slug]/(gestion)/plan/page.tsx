import { notFound } from 'next/navigation'
import { catalog, events, plans } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { capacidadDePlan, NOMBRE_DE_EFECTO, type Allowance } from '@/modules/plans'
import { BillingToggle } from '@/modules/plans/ui/BillingToggle'
import { PlanChangeForm } from '@/modules/plans/ui/PlanChangeForm'
import { PlanDecisionForms } from '@/modules/plans/ui/PlanDecisionForms'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { isErr } from '@/shared/result'
import { tr } from '@/shared/i18n/idioma-servidor'
import { traducir } from '@/shared/i18n/en-ingles'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Plan', 'Plan') }
}

// El plan cambia en cuanto el atelier aplica una solicitud: esta página no se cachea.
export const dynamic = 'force-dynamic'


export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ plan?: string }>
}) {
  const t = await tr()
  const actor = await requireSession()
  const { slug } = await params
  const { plan: planPedido } = await searchParams

  // Plan y cambio de plan son administración comercial: la ficha, que abren el admin y el dueño.
  const event = await events.getFor(actor, slug, { section: 'ficha' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const capacidad = await plans.allowanceFor(event.value.id)
  if (isErr(capacidad)) throw new Error(capacidad.error.detail)

  const catalogo = await plans.listActive()
  // Los nombres comerciales salen del catálogo de la web; si no se leen, el `slug` sirve.
  const comerciales = await catalog.listPlans('es')
  const nombreDe = (slug: string) => (isErr(comerciales) ? slug : (comerciales.value.find((p) => p.slug === slug)?.name ?? slug))
  const pendiente = await plans.pendingChange(event.value.id)

  const tarjetas: Array<{
    id: string
    name: string
    allowance: Allowance
    price?: { cents: number; annualCents: number | null; currency: string } | undefined
  }> = catalogo.map((plan) => ({
    id: plan.id,
    name: nombreDe(plan.slug),
    price:
      plan.priceCents === undefined
        ? undefined
        : { cents: plan.priceCents, annualCents: plan.priceAnnualCents ?? null, currency: 'BOB' },
    allowance: capacidadDePlan(plan),
  }))

  const actual = capacidad.value.planSlug
  // Los extras comprados ya están sumados en la capacidad; aquí se dicen por su nombre.
  const extras = await plans.eventExtras(event.value.id)

  return (
    <>
      <PanelHeader kicker={t('Evento', 'Event')} title={t('Plan', 'Plan')} />

      <div className="flex flex-col gap-4.5">
        {/* Las tarjetas van sueltas sobre el marfil, como en la maqueta: meterlas dentro
            de otra tarjeta las encerraba en un marco que la maqueta no tiene.
            El conmutador solo aparece si algún plan tiene precio anual cargado: hoy se
            cobran una vez por evento, y pintar una suscripción que nadie vende haría
            esperar una factura mensual que no existe. */}
        <BillingToggle
          plans={tarjetas.map((tarjeta) => ({
            id: tarjeta.id,
            current: tarjeta.allowance.planSlug === actual,
            allowance: tarjeta.allowance,
            name: tarjeta.name,
            price: tarjeta.price,
            changeHref: `/dashboard/events/${event.value.slug}/plan?plan=${tarjeta.allowance.planSlug}#cambio`,
          }))}
        />

        {extras.length === 0 ? null : (
          <PanelCard title={t('Extras activos en este evento', 'Extras active on this event')}>
            <ul className="flex flex-col">
              {extras.map((x, i) => (
                <li className="border-b border-line-panel py-2 text-[13px] text-ink last:border-none" key={`${x.effect}-${i}`}>
                  {traducir(NOMBRE_DE_EFECTO[x.effect], t)}
                  {x.amount > 0 ? ` · +${x.amount}` : ''}
                </li>
              ))}
            </ul>
          </PanelCard>
        )}

        <PanelCard id="cambio" title={t('Cambio de plan', 'Plan change')}>
          {isErr(pendiente) || pendiente.value === null ? (
            // No hay cobro en línea: esto registra la petición, no la cobra ni la aplica.
            <PlanChangeForm
              defaultPlanSlug={planPedido ?? null}
              eventId={event.value.id}
              eventSlug={event.value.slug}
              options={tarjetas
                .filter((t) => t.allowance.planSlug !== actual)
                .map((t) => ({ id: t.id, slug: t.allowance.planSlug, name: t.name }))}
            />
          ) : (
            <div aria-label={t('Solicitud pendiente', 'Pending request')} className="flex flex-col gap-4">
              <p className="text-[14px] text-ink">
                {t('Solicitud sin resolver: pasar al plan', 'Unresolved request: move to the plan')}{' '}
                <strong className="font-normal">{nombreDe(pendiente.value.requestedPlanSlug)}</strong>.
              </p>
              {pendiente.value.note === null ? null : (
                <p className="text-[13px] text-ink-mute">«{pendiente.value.note}»</p>
              )}
              <p className="text-[12px] text-ink-mute">
                {t('El cobro se acuerda fuera del sistema. Aplícala cuando esté pagada; el plan del evento cambia en ese momento.', 'Payment is arranged outside the system. Apply it once it is paid; the event’s plan changes at that moment.')}
              </p>
              <PlanDecisionForms eventSlug={event.value.slug} requestId={pendiente.value.id} />
            </div>
          )}
        </PanelCard>
      </div>
    </>
  )
}
