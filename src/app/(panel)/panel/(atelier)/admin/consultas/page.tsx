import { admin, catalog, leads } from '@/app/composition/container'
import { requireAdmin } from '@/modules/identity/session-cookie'
import { ESTADOS_CONSULTA, tasaDeCierre } from '@/modules/leads/domain/pipeline'
import { ConsultationItem } from '@/modules/leads/ui/ConsultationItem'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard, StatCard } from '@/modules/shell/ui/cards'
import { SegmentedTabs } from '@/shared/design/ui/panel/SegmentedTabs'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Consultas · Administración' }
export const dynamic = 'force-dynamic'

const FILTROS = [
  { key: 'new', label: 'Nuevas' },
  { key: 'contacted', label: 'Contactadas' },
  { key: 'won', label: 'Ganadas' },
  { key: 'lost', label: 'Perdidas' },
  { key: 'todas', label: 'Todas' },
] as const

const FECHA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const RECIBIDA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' })

/**
 * Lo que llega del formulario de contacto de la web.
 *
 * Llevaba guardándose desde el ciclo 1 sin que ninguna pantalla lo leyera. El filtro vive
 * en la URL (`?estado=`), como el resto del estado del panel: cada acción revalida y
 * remonta, y un `useState` saltaría a otra pestaña justo después de mover una consulta.
 */
export default async function AdminConsultasPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireAdmin()

  const { estado } = await searchParams
  const filtro = FILTROS.find((f) => f.key === estado)?.key ?? 'new'

  const [consultas, eventos, categorias] = await Promise.all([
    leads.list(filtro === 'todas' ? null : filtro),
    admin.events(),
    catalog.listCategories('es'),
  ])

  if (isErr(consultas)) {
    return (
      <>
        <PanelHeader kicker="Administración" title="Consultas" />
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer las consultas. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      </>
    )
  }

  const { filas: visibles, conteo } = consultas.value
  const total = ESTADOS_CONSULTA.reduce((suma, e) => suma + conteo[e], 0)
  const tasa = tasaDeCierre(conteo)

  const nombreCategoria = new Map(isErr(categorias) ? [] : categorias.value.map((c) => [c.slug, c.name]))
  const bodas = isErr(eventos) ? [] : eventos.value.map((e) => ({ id: e.id, title: e.title }))

  return (
    <>
      <PanelHeader kicker="Administración" meta="Lo que llega del formulario de contacto de la web" title="Consultas" />

      <div className="grid grid-cols-2 gap-3 min-[560px]:gap-4.5 min-[900px]:grid-cols-4">
        <StatCard detail="Sin contactar todavía" label="Nuevas" value={conteo.new} />
        <StatCard detail="Esperando respuesta" label="Contactadas" value={conteo.contacted} />
        <StatCard detail={`${conteo.lost} perdidas`} label="Ganadas" value={conteo.won} />
        <StatCard
          detail="Ganadas sobre decididas"
          label="Tasa de cierre"
          progress={tasa ?? undefined}
          suffix={tasa === null ? undefined : '%'}
          value={tasa === null ? '—' : Math.round(tasa * 100)}
        />
      </div>

      <PanelCard className="mt-4.5" title="Bandeja">
        {/* Cinco estados no caben en un teléfono: el carril se desplaza en vez de salirse. */}
        <div className="-mx-1 mb-2 overflow-x-auto px-1 pb-1">
          <SegmentedTabs
            current={filtro}
            label="Filtrar consultas por estado"
            segments={FILTROS.map((f) => ({
              key: f.key,
              label: f.label,
              href: f.key === 'new' ? '/panel/admin/consultas' : `/panel/admin/consultas?estado=${f.key}`,
              count: f.key === 'todas' ? total : conteo[f.key],
            }))}
          />
        </div>

        {visibles.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-ink-mute">
            {filtro === 'new' ? 'Ninguna consulta nueva. Todo contestado.' : 'No hay consultas en este estado.'}
          </p>
        ) : (
          <ul className="flex flex-col">
            {visibles.map((c) => (
              <ConsultationItem
                key={c.id}
                consulta={{
                  id: c.id,
                  name: c.name,
                  email: c.email,
                  phone: c.phone,
                  category: c.categorySlug === null ? null : (nombreCategoria.get(c.categorySlug) ?? c.categorySlug),
                  eventDateLabel: c.eventDate === null ? null : FECHA.format(new Date(`${c.eventDate}T00:00:00Z`)),
                  message: c.message,
                  status: c.status,
                  note: c.note,
                  receivedLabel: `Llegó ${RECIBIDA.format(c.createdAt)}`,
                  event: c.event,
                }}
                eventos={bodas}
              />
            ))}
          </ul>
        )}
      </PanelCard>
    </>
  )
}
