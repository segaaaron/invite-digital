import { admin } from '@/app/composition/container'
import { requireAdmin } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard, StatCard } from '@/modules/shell/ui/cards'
import { BarRow } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Administración' }
export const dynamic = 'force-dynamic'

// Con el año dentro: la serie cruza de año y «ene» sin más no dice cuál.
const MES = new Intl.DateTimeFormat('es-BO', { month: 'short', year: '2-digit', timeZone: 'UTC' })

export default async function AdminPage() {
  await requireAdmin()

  const metricas = await admin.metrics()

  if (isErr(metricas)) {
    return (
      <>
        <PanelHeader kicker="Administración" title="Panorama" />
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos calcular las métricas. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      </>
    )
  }

  const { eventos, usuarios, invitados, pedidosAprobados, porMes, porPlan } = metricas.value
  const techoMes = Math.max(1, ...porMes.map((m) => m.total))
  const techoPlan = Math.max(1, ...porPlan.map((p) => p.total))

  return (
    <>
      <PanelHeader kicker="Administración" meta="Todo el sistema, no solo tus eventos" title="Panorama" />

      <div className="grid gap-4.5 min-[560px]:grid-cols-2 min-[900px]:grid-cols-4">
        <StatCard label="Eventos" value={eventos} />
        <StatCard label="Atelieres" value={usuarios} />
        <StatCard label="Invitados cargados" value={invitados} />
        <StatCard label="Pedidos aprobados" value={pedidosAprobados} />
      </div>

      <div className="mt-4.5 grid gap-4.5 min-[900px]:grid-cols-2">
        <PanelCard title="Eventos de los próximos doce meses">
          {/* Hacia adelante, no hacia atrás: las bodas están siempre por venir. Y los
              doce meses siempre, con los huecos a cero. */}
          <div className="flex flex-col">
            {porMes.map((fila) => (
              <BarRow
                key={fila.mes}
                label={MES.format(new Date(`${fila.mes}-01T00:00:00Z`))}
                ratio={fila.total / techoMes}
                value={String(fila.total)}
              />
            ))}
          </div>
        </PanelCard>

        <PanelCard title="Reparto por plan">
          {porPlan.length === 0 ? (
            <p className="text-[13px] text-ink-mute">Todavía no hay eventos.</p>
          ) : (
            <div className="flex flex-col">
              {porPlan.map((fila) => (
                <BarRow key={fila.plan} label={fila.plan} ratio={fila.total / techoPlan} tone="gold" value={String(fila.total)} />
              ))}
            </div>
          )}
        </PanelCard>
      </div>
    </>
  )
}
