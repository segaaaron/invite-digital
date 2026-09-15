import { admin, catalog, leads } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { ESTADOS_CONSULTA, tasaDeCierre } from '@/modules/leads/domain/pipeline'
import { ConsultationDetail, ConsultationRow, type ConsultationView } from '@/modules/leads/ui/ConsultationDetail'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { SegmentedTabs } from '@/shared/design/ui/panel/SegmentedTabs'
import { isErr } from '@/shared/result'
import { EmptyState } from '@/shared/design/ui/panel/estados'

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
const RECIBIDA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' })
const CORTA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', timeZone: 'America/La_Paz' })

/**
 * Lo que llega del formulario de contacto de la web, como una bandeja de entrada: la lista a
 * la izquierda y la consulta abierta a la derecha (patrón lista + detalle de los clientes de
 * correo y los CRM). En el teléfono, la lista y, al abrir una, solo su detalle con «volver».
 *
 * Filtro y consulta abierta viven en la URL (`?estado=`, `?id=`): cada acción revalida y
 * remonta, y un `useState` perdería lo que se estaba mirando.
 */
export default async function AdminConsultasPage({ searchParams }: { searchParams: Promise<{ estado?: string; id?: string }> }) {
  await requireAdmin()

  const { estado, id } = await searchParams
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

  const { filas, conteo } = consultas.value
  const total = ESTADOS_CONSULTA.reduce((suma, e) => suma + conteo[e], 0)
  const tasa = tasaDeCierre(conteo)
  const nombreCategoria = new Map(isErr(categorias) ? [] : categorias.value.map((c) => [c.slug, c.name]))
  const bodas = isErr(eventos) ? [] : eventos.value.map((e) => ({ id: e.id, title: e.title }))

  const vistas: ConsultationView[] = filas.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    category: c.categorySlug === null ? null : (nombreCategoria.get(c.categorySlug) ?? c.categorySlug),
    eventDateLabel: c.eventDate === null ? null : FECHA.format(new Date(`${c.eventDate}T00:00:00Z`)),
    message: c.message,
    status: c.status,
    note: c.note,
    receivedLabel: `Llegó el ${RECIBIDA.format(c.createdAt)}`,
    shortDateLabel: CORTA.format(c.createdAt),
    event: c.event,
  }))

  const enlace = (params: { estado?: string; id?: string }) => {
    const q = new URLSearchParams()
    const e = params.estado ?? filtro
    if (e !== 'new') q.set('estado', e)
    if (params.id) q.set('id', params.id)
    const cadena = q.toString()
    return cadena === '' ? '/panel/admin/consultas' : `/panel/admin/consultas?${cadena}`
  }
  // Abierta la pedida; si ya no está en este filtro (se acaba de mover), la primera.
  const abierta = vistas.find((c) => c.id === id) ?? vistas[0]
  const pidioUna = id !== undefined && abierta !== undefined

  const meta =
    total === 0
      ? 'Lo que llega del formulario de contacto de la web'
      : `${conteo.new} sin contestar · ${tasa === null ? 'sin cierres todavía' : `${Math.round(tasa * 100)} % de cierre`}`

  return (
    <>
      <PanelHeader kicker="Administración" meta={meta} title="Consultas" />

      {total === 0 ? (
        <PanelCard>
          <EmptyState
            action={
              <PanelButton external href="/es#contacto">
                Ver el formulario en la web
              </PanelButton>
            }
            description="Cuando alguien escriba desde el formulario de contacto de la web, su consulta llega aquí con su teléfono, su correo y lo que quiere celebrar."
            title="Todavía no ha llegado ninguna consulta"
          />
        </PanelCard>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line-panel bg-bg-raised shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto border-b border-line-panel px-4 py-3">
            <SegmentedTabs
              current={filtro}
              label="Filtrar consultas por estado"
              segments={FILTROS.map((f) => ({
                key: f.key,
                label: f.label,
                href: enlace({ estado: f.key }),
                count: f.key === 'todas' ? total : conteo[f.key],
              }))}
            />
          </div>

          <div className="grid min-h-[520px] min-[900px]:grid-cols-[340px_1fr]">
            {/* En el teléfono, con una consulta abierta se ve solo el detalle. */}
            <div className={`border-line-panel min-[900px]:border-r ${pidioUna ? 'max-[899px]:hidden' : ''}`}>
              {vistas.length === 0 ? (
                <EmptyState title={filtro === 'new' ? 'Nada nuevo: todo contestado.' : 'No hay consultas en este estado.'} />
              ) : (
                <ul className="max-h-[70vh] overflow-y-auto">
                  {vistas.map((c) => (
                    <ConsultationRow abierta={c.id === abierta?.id} consulta={c} href={enlace({ id: c.id })} key={c.id} />
                  ))}
                </ul>
              )}
            </div>

            <div className={`p-6 min-[900px]:p-8 ${pidioUna ? '' : 'max-[899px]:hidden'}`}>
              {abierta === undefined ? (
                <EmptyState title="Elige una consulta de la lista." />
              ) : (
                <>
                  {pidioUna ? (
                    <div className="mb-4 min-[900px]:hidden">
                      <PanelButton href={enlace({})}>← Volver a la lista</PanelButton>
                    </div>
                  ) : null}
                  <ConsultationDetail consulta={abierta} eventos={bodas} key={abierta.id} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
