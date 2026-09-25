import { admin } from '@/app/composition/container'
import { AvisoGrupo, ProximaFila } from '@/modules/admin/ui/HoyPiezas'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard, StatCard } from '@/shared/design/ui/panel/cards'
import { BarRow } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'
import { formatAmount } from '@/shared/money'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { CheckIcon } from '@/shared/design/ui/icons'

export const metadata = { title: 'Hoy · Administración' }
export const dynamic = 'force-dynamic'

const HOY = new Intl.DateTimeFormat('es-BO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

// Con el año dentro: la serie cruza de año y «ene» sin más no dice cuál.
const MES = new Intl.DateTimeFormat('es-BO', { month: 'short', year: '2-digit', timeZone: 'UTC' })

/**
 * «Hoy»: lo que le espera al admin. Sustituyó a Panorama como portada de la
 * administración, porque unas cifras no dicen qué hacer; las cifras siguen debajo.
 *
 * Qué es un aviso lo decide `admin/domain/hoy.ts`, con la fecha de Bolivia.
 */
export default async function AdminPage() {
  await requireAdmin()

  const [hoy, metricas, dinero] = await Promise.all([admin.today(), admin.metrics(), admin.todayMoney()])

  if (isErr(hoy) || isErr(metricas) || isErr(dinero)) {
    return (
      <>
        <PanelHeader kicker="Administración" title="Hoy" />
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer lo pendiente. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      </>
    )
  }

  const { fecha, hoy: h } = hoy.value
  const { eventos, porMes, porPlan } = metricas.value
  const i = dinero.value
  const bs = (cents: number) => formatAmount(cents, 'BOB')
  // Solo los grupos con algo: tres listas vacías una debajo de otra esconden la que importa.
  const grupos = [
    { id: 'ventas', titulo: 'Ventas', avisos: h.ventas },
    { id: 'riesgos', titulo: 'Eventos en riesgo', avisos: h.riesgos },
    { id: 'atascados', titulo: 'Clientes atascados', avisos: h.atascados },
  ].filter((g) => g.avisos.length > 0)
  const techoMes = Math.max(1, ...porMes.map((m) => m.total))
  const techoPlan = Math.max(1, ...porPlan.map((p) => p.total))
  const dia = HOY.format(new Date(`${fecha}T00:00:00Z`))

  return (
    <>
      <PanelHeader
        kicker="Administración"
        meta={`${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${
          h.total === 0 ? 'nada pendiente' : h.total === 1 ? '1 cosa espera por ti' : `${h.total} cosas esperan por ti`
        }`}
        title="Hoy"
      />

      {/* Sin fila de cifras encima: repetía los mismos tres grupos de «Por hacer». */}
      <div className="grid items-start gap-4.5 min-[900px]:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <PanelCard title="Por hacer">
          {grupos.length === 0 ? (
            <EmptyState
              compact
              description="Ningún comprobante, consulta ni cambio de plan esperando; ningún evento cercano en riesgo y ningún cliente atascado."
              icon={<CheckIcon />}
              title="Todo al día"
            />
          ) : (
            <div className="flex flex-col gap-7">
              {grupos.map((g) => (
                <div className="scroll-mt-6" id={g.id} key={g.id}>
                  <AvisoGrupo avisos={g.avisos} titulo={g.titulo} vacio="" />
                </div>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard title="Próximos eventos">
          <p className="-mt-2 mb-3 font-mono text-[10.5px] tracking-[0.16em] text-ink-mute uppercase">Los próximos 30 días</p>
          {h.proximas.length === 0 ? (
            <EmptyState compact title="Ningún evento en los próximos 30 días" />
          ) : (
            <ul className="flex flex-col">
              {h.proximas.map((boda) => (
                <ProximaFila key={boda.slug} boda={boda} />
              ))}
            </ul>
          )}
        </PanelCard>
      </div>

      <h2 className="mt-9 mb-4 font-mono text-[10px] tracking-[0.18em] text-ink-mute uppercase">El negocio</h2>

      <div className="grid grid-cols-2 gap-3 min-[560px]:gap-4.5 min-[900px]:grid-cols-4">
        {/* Lo que dice cómo va el negocio, no cuántas filas hay en la base. */}
        <StatCard detail="Pedidos aprobados este mes" label="Cobrado este mes" value={bs(i.esteMes)} />
        <StatCard detail={`${bs(i.sinPago)} en pedidos sin comprobante`} label="Por revisar" value={bs(i.porRevisar)} />
        <StatCard
          detail="Consultas que terminaron en venta, último año"
          label="Cierre de consultas"
          value={i.cierreDeConsultas === null ? '—' : `${i.cierreDeConsultas} %`}
        />
        <StatCard detail="Todos los eventos del sistema" label="Eventos" value={eventos} />
      </div>

      <div className="mt-4.5 grid gap-4.5 min-[900px]:grid-cols-2">
        <PanelCard title="Eventos de los próximos doce meses">
          {/* Hacia adelante, no hacia atrás: las bodas están siempre por venir. Y los
              doce meses siempre, con los huecos a cero. */}
          {porMes.every((fila) => fila.total === 0) ? (
            <EmptyState compact title="Ningún evento en los próximos doce meses" />
          ) : (
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
          )}
        </PanelCard>

        <PanelCard title="Reparto por plan">
          {porPlan.length === 0 ? (
            <EmptyState compact title="Todavía no hay eventos" />
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
