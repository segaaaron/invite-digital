import { admin } from '@/app/composition/container'
import { AvisoGrupo, HoyTile, ProximaFila } from '@/modules/admin/ui/HoyPiezas'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard, StatCard } from '@/shared/design/ui/panel/cards'
import { BarRow } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

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

  const [hoy, metricas] = await Promise.all([admin.today(), admin.metrics()])

  if (isErr(hoy) || isErr(metricas)) {
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
  const { eventos, usuarios, invitados, pedidosAprobados, porMes, porPlan } = metricas.value
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

      <div className="grid grid-cols-2 gap-3 min-[560px]:gap-4.5 min-[900px]:grid-cols-4">
        <HoyTile detail="Transfirieron y esperan" href="/panel/pedidos" label="Comprobantes" value={h.totales.pedidos} />
        <HoyTile detail="Sin contactar" href="/panel/admin/consultas" label="Consultas nuevas" value={h.totales.consultas} />
        <HoyTile detail="Por decidir" href="#ventas" label="Cambios de plan" value={h.totales.cambios} />
        <HoyTile detail="A 30 días o menos" href="#riesgos" label="Eventos en riesgo" value={h.totales.riesgos} />
      </div>

      <div className="mt-4.5 grid items-start gap-4.5 min-[900px]:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <PanelCard title="Por hacer">
          <div className="flex flex-col gap-7">
            <div id="ventas" className="scroll-mt-6">
              <AvisoGrupo
                avisos={h.ventas}
                titulo="Ventas"
                vacio="Ningún comprobante, consulta ni cambio de plan esperando."
              />
            </div>
            <div id="riesgos" className="scroll-mt-6">
              <AvisoGrupo avisos={h.riesgos} titulo="Eventos en riesgo" vacio="Ningún evento cercano en borrador ni sin invitados." />
            </div>
            <AvisoGrupo
              avisos={h.atascados}
              titulo="Clientes atascados"
              vacio="Todos los clientes con acceso ya entraron, y ningún pedido lleva una semana sin pago."
            />
          </div>
        </PanelCard>

        <PanelCard title="Próximos eventos">
          <p className="-mt-2 mb-3 font-mono text-[9px] tracking-[0.3em] text-ink-mute uppercase">Los próximos 14 días</p>
          {h.proximas.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink-mute">Ningún evento en los próximos 14 días.</p>
          ) : (
            <ul className="flex flex-col">
              {h.proximas.map((boda) => (
                <ProximaFila key={boda.slug} boda={boda} />
              ))}
            </ul>
          )}
        </PanelCard>
      </div>

      <h2 className="mt-9 mb-4 font-mono text-[10px] tracking-[0.35em] text-ink-mute uppercase">El negocio</h2>

      <div className="grid grid-cols-2 gap-3 min-[560px]:gap-4.5 min-[900px]:grid-cols-4">
        <StatCard label="Eventos" value={eventos} />
        <StatCard label="Usuarios" value={usuarios} />
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
