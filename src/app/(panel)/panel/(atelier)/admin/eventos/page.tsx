import { admin } from '@/app/composition/container'
import { ETAPAS, etapaDe, ordenarCartera, type Etapa } from '@/modules/admin/domain/cartera'
import { diasEntre, fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { NuevaBodaForm } from '@/modules/admin'
import { EventAdminRow } from '@/modules/admin/ui/EventAdminRow'
import { themeDefinitions } from '@/modules/events/ui/themes/registry'
import { CATALOG_ENTRIES, CATALOG_KEYS } from '@/shared/design/theme-catalog'
import { requireAdmin } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard, StatCard } from '@/modules/shell/ui/cards'
import { FIELD_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { SegmentedTabs } from '@/shared/design/ui/panel/SegmentedTabs'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Eventos · Administración' }
export const dynamic = 'force-dynamic'

/** «en 12 días», «hoy», «hace 3 meses»: lo que se lee de un vistazo, no una fecha ISO. */
function cuando(dias: number): string {
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'mañana'
  if (dias === -1) return 'ayer'
  const n = Math.abs(dias)
  const texto = n < 45 ? `${n} días` : n < 365 ? `${Math.round(n / 30)} meses` : `${Math.round(n / 365)} año${Math.round(n / 365) === 1 ? '' : 's'}`
  return dias > 0 ? `en ${texto}` : `hace ${texto}`
}

/**
 * La cartera: todas las bodas del sistema, de cualquier atelier, con su etapa.
 *
 * Filtro y búsqueda viven en la URL (`?etapa=`, `?q=`). La búsqueda es un formulario `GET`
 * normal, sin JavaScript: una lista de bodas no necesita filtrar a cada tecla.
 */
export default async function AdminEventosPage({
  searchParams,
}: {
  searchParams: Promise<{ etapa?: string; q?: string; panel?: string }>
}) {
  await requireAdmin()

  const { etapa: etapaPedida, q = '', panel } = await searchParams
  const [eventos, usuarios, planes] = await Promise.all([admin.events(), admin.users(), admin.planOptions()])
  const hoy = fechaEnBolivia(new Date())
  const filtro: Etapa | 'todas' = ETAPAS.find((e) => e.clave === etapaPedida)?.clave ?? 'todas'
  const busqueda = q.trim().toLowerCase()

  const cartera = isErr(eventos)
    ? []
    : ordenarCartera(
        eventos.value.map((e) => ({ ...e, etapa: etapaDe(e, hoy) })),
        hoy,
      )
  const conteo = new Map<string, number>()
  for (const e of cartera) conteo.set(e.etapa, (conteo.get(e.etapa) ?? 0) + 1)

  const visibles = cartera.filter(
    (e) =>
      (filtro === 'todas' || e.etapa === filtro) &&
      (busqueda === '' || [e.title, e.slug, e.ownerEmail ?? ''].some((campo) => campo.toLowerCase().includes(busqueda))),
  )
  const mostrarAlta = panel === 'nueva' || cartera.length === 0

  // Lo primero que se lee: qué pide atención ahora, no el total de filas.
  const proximos30 = cartera.filter((e) => {
    const dias = diasEntre(hoy, e.eventDate)
    return dias >= 0 && dias <= 30
  }).length
  const enCurso = cartera.filter((e) => e.etapa === 'repartiendo' || e.etapa === 'confirmando').length
  const borradores = cartera.filter((e) => e.etapa === 'borrador' || e.etapa === 'sin_invitados').length
  const celebrados = cartera.filter((e) => e.etapa === 'celebrada').length

  const BS = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', maximumFractionDigits: 0 })
  const opcionesDePlan = planes.map((p) => ({ slug: p.slug, nombre: p.nombre, precio: BS.format(p.priceCents / 100) }))
  const nombreDePlan = new Map(planes.map((p) => [p.slug, p.nombre]))
  const temas = themeDefinitions()
  const nombreDeModelo = new Map(temas.map((t) => [t.key, t.label]))
  const enlace = (clave: string) => {
    const params = new URLSearchParams()
    if (clave !== 'todas') params.set('etapa', clave)
    if (q.trim() !== '') params.set('q', q.trim())
    const cadena = params.toString()
    return cadena === '' ? '/panel/admin/eventos' : `/panel/admin/eventos?${cadena}`
  }

  return (
    <>
      <PanelHeader
        actions={
          <>
            {/* Lo habitual es con cliente —boda, XV años…—, y va primero y en negro. Sin cliente
                es un evento que lleva el atelier sin dar acceso a nadie. */}
            <PanelButton href="/panel/admin/eventos?panel=nueva" variant="primary">
              + Evento para un cliente
            </PanelButton>
            <PanelButton href="/panel/eventos/nuevo">Evento sin acceso de cliente</PanelButton>
          </>
        }
        kicker="Administración"
        meta="Todos los eventos del sistema, de cualquier atelier"
        title="Eventos"
      />

      {cartera.length === 0 ? null : (
        <div className="mb-4.5 grid grid-cols-2 gap-3 min-[900px]:grid-cols-4">
          <StatCard detail="Con fecha en el próximo mes" label="Próximos 30 días" value={proximos30} />
          <StatCard detail="Repartiendo o confirmando" label="En curso" value={enCurso} />
          <StatCard detail="Borrador o sin invitados" label="Por preparar" value={borradores} />
          <StatCard detail="Ya pasó la fecha" label="Celebrados" value={celebrados} />
        </div>
      )}

      {/* El alta se abre con `?panel=nueva`, como los paneles de Invitados: abierta siempre
          ocupaba la primera pantalla entera y la cartera quedaba debajo del pliegue. Va
          **antes** de la lista cuando se abre, y abierta sin pedirla si no hay ninguna boda. */}
      {mostrarAlta ? (
      <PanelCard action={<PanelButton href="/panel/admin/eventos">Cerrar</PanelButton>} className="mb-4.5" title="Nuevo evento para un cliente">
        <NuevaBodaForm
          // El clásico no se ofrece: no se publica en el catálogo, es el respaldo de una
          // clave desconocida. Nadie lo elige mirando la web.
          modelos={temas
            .filter((tema) => tema.key !== 'clasico')
            .map((tema) => ({
              key: tema.key,
              label: tema.label,
              categoria: CATALOG_ENTRIES.find((entrada) => entrada.key === tema.key)?.categorySlug === 'xv-anos' ? 'XV años' : 'Bodas',
            }))}
          planes={opcionesDePlan}
        />
      </PanelCard>
      ) : null}

      <PanelCard
        action={
          <form action="/panel/admin/eventos" className="flex w-full gap-2 min-[560px]:w-auto" method="get" role="search">
            {filtro === 'todas' ? null : <input name="etapa" type="hidden" value={filtro} />}
            <label className="sr-only" htmlFor="buscar-boda">
              Buscar evento por nombre, slug o dueño
            </label>
            <input
              className={`${FIELD_CLASS} py-2 text-[13px] min-[560px]:w-[260px]`}
              defaultValue={q}
              id="buscar-boda"
              name="q"
              placeholder="Buscar por nombre, slug o dueño"
              type="search"
            />
            <PanelButton type="submit">Buscar</PanelButton>
          </form>
        }
        title="Cartera"
      >
        {/* Seis etapas no caben en un teléfono: el carril se desplaza en vez de partirse. */}
        <div className="-mx-1 mb-2 overflow-x-auto px-1 pb-1">
          <SegmentedTabs
            current={filtro}
            label="Filtrar eventos por etapa"
            segments={[
              { key: 'todas', label: 'Todas', href: enlace('todas'), count: cartera.length },
              ...ETAPAS.map((e) => ({ key: e.clave, label: e.etiqueta, href: enlace(e.clave), count: conteo.get(e.clave) ?? 0 })),
            ]}
          />
        </div>

        {isErr(eventos) || isErr(usuarios) ? (
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los eventos. La base no responde; vuelve a intentarlo en un momento.
          </p>
        ) : visibles.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-ink-mute">
            {cartera.length === 0 ? 'Todavía no hay ningún evento en el sistema.' : 'Ningún evento con ese filtro.'}
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3.5">
            {visibles.map((evento) => (
              <EventAdminRow
                key={evento.id}
                event={{
                  id: evento.id,
                  slug: evento.slug,
                  title: evento.title,
                  eventDate: evento.eventDate,
                  ownerEmail: evento.ownerEmail,
                  ownerId: evento.ownerId,
                  planSlug: evento.planSlug,
                  planNombre: evento.planSlug === null ? null : (nombreDePlan.get(evento.planSlug) ?? evento.planSlug),
                  portada: CATALOG_KEYS.includes(evento.themeKey) ? `/templates/${evento.themeKey}.avif` : null,
                  modelo: nombreDeModelo.get(evento.themeKey) ?? 'diseño anterior',
                  grupos: evento.grupos,
                  enviados: evento.enviados,
                  respondidos: evento.respondidos,
                  etapa: evento.etapa,
                  cuando: cuando(diasEntre(hoy, evento.eventDate)),
                }}
                owners={usuarios.value.map((u) => ({ id: u.id, email: u.email }))}
                plans={planes}
              />
            ))}
          </ul>
        )}
      </PanelCard>
    </>
  )
}
