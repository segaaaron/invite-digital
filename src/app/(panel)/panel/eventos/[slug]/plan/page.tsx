import Link from 'next/link'
import { notFound } from 'next/navigation'
import { events, plans } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import type { Allowance } from '@/modules/plans'
import { applyPlanChangeAction, rejectPlanChangeAction } from '@/modules/plans/actions'
import { PlanCard } from '@/modules/plans/ui/PlanCard'
import { PlanChangeForm } from '@/modules/plans/ui/PlanChangeForm'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Plan' }

// El plan cambia en cuanto el atelier aplica una solicitud: esta página no se cachea.
export const dynamic = 'force-dynamic'

const BOTON = 'rounded-full border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink'

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

  const tarjetas: Array<{ id: string; allowance: Allowance }> = catalogo.map((plan) => ({
    id: plan.id,
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
    <div className="mx-auto flex max-w-[1000px] flex-col gap-10 p-10">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <h1 className="font-display text-[26px] font-light text-ink">Plan · {event.value.title}</h1>
        <Link className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" href={`/panel/eventos/${event.value.slug}`}>
          Volver al evento
        </Link>
      </header>

      <section className="flex flex-col gap-5">
        <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Planes</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {tarjetas.map((tarjeta) => (
            <PlanCard current={tarjeta.allowance.planSlug === actual} key={tarjeta.id} plan={tarjeta.allowance} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Cambio de plan</h2>

        {isErr(pendiente) || pendiente.value === null ? (
          // No hay cobro en línea: esto registra la petición, no la cobra ni la aplica.
          <PlanChangeForm
            eventId={event.value.id}
            eventSlug={event.value.slug}
            options={tarjetas.filter((t) => t.allowance.planSlug !== actual).map((t) => ({ id: t.id, slug: t.allowance.planSlug }))}
          />
        ) : (
          <div className="flex flex-col gap-4 rounded-[18px] border border-line p-6" aria-label="Solicitud pendiente">
            <p className="text-[14px] text-ink">
              Solicitud sin resolver: pasar al plan <strong className="font-normal">{pendiente.value.requestedPlanSlug}</strong>.
            </p>
            {pendiente.value.note === null ? null : <p className="text-[13px] text-ink-mute">«{pendiente.value.note}»</p>}
            <p className="text-[12px] text-ink-mute">
              El cobro se acuerda fuera del sistema. Aplícala cuando esté pagada; el plan del evento cambia en ese momento.
            </p>
            <div className="flex items-center gap-3">
              <form action={applyPlanChangeAction}>
                <input name="requestId" type="hidden" value={pendiente.value.id} readOnly />
                <input name="eventSlug" type="hidden" value={event.value.slug} readOnly />
                <button className={BOTON} type="submit">
                  Aplicar el cambio
                </button>
              </form>
              <form action={rejectPlanChangeAction}>
                <input name="requestId" type="hidden" value={pendiente.value.id} readOnly />
                <input name="eventSlug" type="hidden" value={event.value.slug} readOnly />
                <button className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" type="submit">
                  Descartar
                </button>
              </form>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
