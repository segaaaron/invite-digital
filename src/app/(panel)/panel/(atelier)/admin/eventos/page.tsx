import Link from 'next/link'
import { admin, events, leads, orders } from '@/app/composition/container'
import { ETAPAS, etapaDe, ordenarCartera, type Etapa } from '@/modules/admin/domain/cartera'
import { diasEntre, fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { saludDelEvento } from '@/modules/admin/domain/salud'
import { NuevaBodaForm, type DesdePedido } from '@/modules/admin'
import { EventAdminRow, type EventAdminView } from '@/modules/admin/ui/EventAdminRow'
import { themeDefinitions } from '@/modules/events/ui/themes/registry'
import { CATALOG_KEYS, seAsigna } from '@/shared/design/theme-catalog'
import { fiestaDeTema, vocabularioDeCategoria } from '@/modules/events'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { BarraDeFiltros, Semaforo, TiraDeCifras, type FiestaDeLista } from '@/shared/design/ui/panel/lista'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { PanelLateral } from '@/shared/design/ui/panel/PanelLateral'
import { faltaPara, diaDelEvento } from '@/shared/format/fecha'
import { plural } from '@/shared/format/plural'
import { isErr } from '@/shared/result'
import { EmptyState } from '@/shared/design/ui/panel/estados'

export const metadata = { title: 'Eventos · Administración' }
export const dynamic = 'force-dynamic'

const BASE = '/panel/admin/eventos'
/** Eventos por página: cada fila lleva su menú y su diálogo de soporte. */
const PAGINA = 20
const FIESTAS: readonly { key: string; label: string; fiesta: FiestaDeLista }[] = [
  { key: 'todas', label: 'Todas', fiesta: null },
  { key: 'boda', label: 'Bodas', fiesta: 'boda' },
  { key: 'xv', label: 'XV años', fiesta: 'xv' },
  { key: 'cumple', label: 'Cumpleaños', fiesta: 'cumple' },
]

type Params = { [K in 'etapa' | 'fiesta' | 'q' | 'n' | 'crear' | 'pedido' | 'consulta' | 'evento']?: string | undefined }

/**
 * **La cartera**: todos los eventos del sistema, cada uno con **su salud** —si llega bien a su
 * fecha, con la razón en palabras (`saludDelEvento`, con los plazos de un planner)—, su fiesta y
 * su etapa. Lo que viene arriba, por cercanía; lo celebrado detrás.
 *
 * Filtros en la dirección (`?etapa=`, `?fiesta=`, `?q=`; «En riesgo» es una etapa más). El alta
 * de un evento es un panel lateral (`?crear=evento`, y con `&pedido=` nace del pedido pagado);
 * ⌘K abre el resumen de uno (`?evento=`). El calendario es la pestaña de al lado.
 */
export default async function AdminEventosPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin()
  const p = await searchParams
  const hoy = fechaEnBolivia(new Date())

  const [eventos, planes] = await Promise.all([admin.events(), admin.planOptions()])
  if (isErr(eventos)) {
    return (
      <>
        <PanelHeader kicker="Eventos" title="Cartera" />
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los eventos. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      </>
    )
  }

  const temas = themeDefinitions()
  const nombreDeModelo = new Map(temas.map((t) => [t.key, t.label]))
  const nombreDePlan = new Map(planes.map((pl) => [pl.slug, pl.nombre]))
  const cartera = ordenarCartera(
    eventos.value.map((e) => {
      const fiesta = fiestaDeTema(e.themeKey)
      return { ...e, fiesta, etapa: etapaDe(e, hoy), salud: saludDelEvento({ ...e, fiesta }, hoy) }
    }),
    hoy,
  )
  const anfitriones = await events.staff.hostsOf(cartera.map((e) => e.id))

  const filtroEtapa: Etapa | 'todas' | 'riesgo' = p.etapa === 'riesgo' ? 'riesgo' : (ETAPAS.find((e) => e.clave === p.etapa)?.clave ?? 'todas')
  const fiesta = FIESTAS.find((f) => f.key === p.fiesta)?.key ?? 'todas'
  const q = (p.q ?? '').trim()
  const busqueda = q.toLowerCase()
  const deFiesta = cartera.filter((e) => fiesta === 'todas' || e.fiesta === fiesta)
  const visibles = deFiesta.filter(
    (e) =>
      (filtroEtapa === 'todas' || (filtroEtapa === 'riesgo' ? e.salud.tono !== 'ok' : e.etapa === filtroEtapa)) &&
      (busqueda === '' ||
        [e.title, e.slug, e.ownerEmail ?? '', ...(anfitriones.get(e.id) ?? []).map((a) => a.email)].some((campo) => campo.toLowerCase().includes(busqueda))),
  )
  const tope = Number(p.n) > 0 ? Math.min(Number(p.n), 1000) : PAGINA
  const pagina = visibles.slice(0, tope)

  const enlace = (cambio: Params) => {
    const actual: Params = { etapa: filtroEtapa === 'todas' ? undefined : filtroEtapa, fiesta: fiesta === 'todas' ? undefined : fiesta, q: q === '' ? undefined : q, ...cambio }
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(actual)) if (v !== undefined && v !== '') params.set(k, v)
    const cadena = params.toString()
    return cadena === '' ? BASE : `${BASE}?${cadena}`
  }

  // Las cifras: lo que viene, lo que está en riesgo, lo que falta preparar y lo celebrado.
  const proximos30 = deFiesta.filter((e) => {
    const d = diasEntre(hoy, e.eventDate)
    return d >= 0 && d <= 30
  }).length
  const enRiesgo = deFiesta.filter((e) => e.salud.tono !== 'ok').length
  const porPreparar = deFiesta.filter((e) => e.etapa === 'borrador' || e.etapa === 'sin_invitados').length
  const celebrados = deFiesta.filter((e) => e.etapa === 'celebrada').length
  const conteo = new Map<string, number>()
  for (const e of deFiesta) conteo.set(e.etapa, (conteo.get(e.etapa) ?? 0) + 1)

  const vista = (e: (typeof cartera)[number]): EventAdminView => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    eventDate: e.eventDate,
    ownerEmail: e.ownerEmail,
    planNombre: e.planSlug === null ? null : (nombreDePlan.get(e.planSlug) ?? e.planSlug),
    portada: CATALOG_KEYS.includes(e.themeKey) ? `/templates/${e.themeKey}.avif` : null,
    modelo: nombreDeModelo.get(e.themeKey) ?? 'un diseño retirado',
    fiesta: e.fiesta,
    grupos: e.grupos,
    enviados: e.enviados,
    respondidos: e.respondidos,
    etapa: e.etapa,
    cuando: faltaPara(diasEntre(hoy, e.eventDate)),
    salud: { tono: e.salud.tono, texto: e.salud.texto, mas: Math.max(0, e.salud.alertas.length - 1) },
    anfitriones: anfitriones.get(e.id) ?? [],
  })

  const abierto = p.evento === undefined ? undefined : cartera.find((e) => e.slug === p.evento)

  return (
    <>
      <PanelHeader kicker="Eventos" meta="Todos los eventos del sistema, de cualquier atelier" title="Cartera" />

      <TiraDeCifras
        cifras={[
          { label: 'Próximos 30 días', value: proximos30, detail: 'Con fecha en el próximo mes', href: '/panel/admin/eventos/calendario' },
          { label: 'En riesgo', value: enRiesgo, detail: 'Con algo que resolver', href: enlace({ etapa: 'riesgo', n: undefined }), tono: enRiesgo > 0 ? 'alerta' : 'normal' },
          { label: 'Por preparar', value: porPreparar, detail: 'Borrador o sin invitados', href: enlace({ etapa: 'borrador', n: undefined }) },
          { label: 'Celebrados', value: celebrados, detail: 'Ya pasó la fecha', href: enlace({ etapa: 'celebrada', n: undefined }) },
        ]}
      />

      <BarraDeFiltros
        actual={filtroEtapa}
        busqueda={{ accion: BASE, valor: q, placeholder: 'Buscar evento o cliente', ocultos: Object.fromEntries(Object.entries({ etapa: filtroEtapa === 'todas' ? '' : filtroEtapa, fiesta: fiesta === 'todas' ? '' : fiesta }).filter(([, v]) => v !== '')) }}
        etiqueta="Etapa"
        fiestas={{ actual: fiesta, opciones: FIESTAS.map((f) => ({ key: f.key, label: f.label, fiesta: f.fiesta, href: enlace({ fiesta: f.key === 'todas' ? undefined : f.key, n: undefined }) })) }}
        opciones={[
          { key: 'todas', label: 'Todas', href: enlace({ etapa: undefined, n: undefined }), count: deFiesta.length },
          { key: 'riesgo', label: 'En riesgo', href: enlace({ etapa: 'riesgo', n: undefined }), count: enRiesgo },
          ...ETAPAS.map((e) => ({ key: e.clave, label: e.etiqueta, href: enlace({ etapa: e.clave, n: undefined }), count: conteo.get(e.clave) ?? 0 })),
        ]}
      />

      {visibles.length === 0 ? (
        <PanelCard>
          <EmptyState
            action={
              cartera.length === 0 ? (
                <PanelButton href={`${BASE}?crear=evento`} variant="primary">
                  Crear el primer evento
                </PanelButton>
              ) : undefined
            }
            title={cartera.length === 0 ? 'Todavía no hay ningún evento en el sistema' : 'Ningún evento con ese filtro'}
          />
        </PanelCard>
      ) : (
        <>
          <ul className="@container flex flex-col gap-2.5">
            {pagina.map((e) => (
              <EventAdminRow event={vista(e)} key={e.id} />
            ))}
          </ul>
          {visibles.length > pagina.length ? (
            <div className="mt-4">
              <PanelButton href={enlace({ n: String(tope + PAGINA) })}>
                Ver {plural(Math.min(PAGINA, visibles.length - pagina.length), 'evento más', 'eventos más')}
              </PanelButton>
            </div>
          ) : null}
        </>
      )}

      {p.crear === 'evento' ? <AltaDeEvento cerrar={enlace({})} consultaId={p.consulta} pedidoRef={p.pedido} temas={temas} planes={planes} /> : null}

      {abierto === undefined ? null : (
        <PanelLateral closeHref={enlace({})} subtitle={`${diaDelEvento(abierto.eventDate)} · ${faltaPara(diasEntre(hoy, abierto.eventDate))}`} title={abierto.title}>
          <div className="flex flex-col gap-5">
            {/* `@container`: la fila decide sus columnas por el ancho de su lista, no por la ventana. */}
            <ul className="@container flex flex-col gap-2.5">
              <EventAdminRow event={vista(abierto)} />
            </ul>
            <section>
              <h3 className="mb-3 font-mono text-[10px] tracking-[0.18em] text-ink-mute uppercase">Salud del evento</h3>
              {abierto.salud.alertas.length === 0 ? (
                <Semaforo tono="ok">{abierto.salud.texto}</Semaforo>
              ) : (
                <ul className="flex flex-col gap-2">
                  {abierto.salud.alertas.map((a) => (
                    <li key={a.clave}>
                      <Semaforo tono={a.tono}>{a.texto}</Semaforo>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="flex flex-wrap gap-2.5">
              <PanelButton href={`/panel/eventos/${abierto.slug}/configuracion`} variant="primary">
                Abrir la ficha
              </PanelButton>
              <PanelButton href={`/panel/eventos/${abierto.slug}/vista-previa`}>Ver la invitación</PanelButton>
            </div>
          </div>
        </PanelLateral>
      )}
    </>
  )
}

/** El alta de un evento, en su panel. Con `pedidoRef`, nace de un pedido pagado y lo enlaza al crearse. */
async function AltaDeEvento({
  cerrar,
  pedidoRef,
  consultaId,
  temas,
  planes,
}: {
  cerrar: string
  pedidoRef: string | undefined
  consultaId: string | undefined
  temas: ReturnType<typeof themeDefinitions>
  planes: Awaited<ReturnType<typeof admin.planOptions>>
}) {
  const desdePedido = await (async (): Promise<DesdePedido | undefined> => {
    if (pedidoRef === undefined) {
      // Una consulta que se cerró por fuera: el alta nace con su nombre, fecha y contacto.
      const c = consultaId === undefined ? null : await leads.find(consultaId)
      if (c === null || c.status === 'won' || c.status === 'lost') return undefined
      return { ref: null, consultaId: c.id, modelo: null, plan: null, titulo: c.name, fecha: c.eventDate, nombre: c.name, correo: c.email, telefono: c.phone }
    }
    const leido = await orders.byRef(pedidoRef)
    if (isErr(leido)) return undefined
    const o = leido.value.order
    if (o.status !== 'approved' || o.addonSlug !== null || o.eventId !== null) return undefined
    const esCorreo = o.contact.includes('@')
    return { ref: o.publicRef, consultaId: o.consultationId, modelo: o.templateSlug, plan: o.planSlug, titulo: o.customerName, fecha: o.eventDate, nombre: o.customerName, correo: esCorreo ? o.contact : null, telefono: esCorreo ? null : o.contact }
  })()
  const BS = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', maximumFractionDigits: 0 })
  return (
    <PanelLateral ancho="amplio" closeHref={cerrar} subtitle={desdePedido === undefined ? 'Con su diseño, su plan y el acceso del cliente' : desdePedido.ref === null ? `Desde la consulta de ${desdePedido.nombre}: sus datos ya están puestos` : `Desde el pedido ${desdePedido.ref}: lo que eligió ya está puesto`} title="Nuevo evento">
      <NuevaBodaForm
        // Ni el clásico —el respaldo de una clave desconocida— ni los retirados: nadie los elige mirando la web.
        modelos={temas.filter((t) => seAsigna(t.key)).map((t) => ({ key: t.key, label: t.label, categoria: vocabularioDeCategoria(t.categorySlug).plural }))}
        pedido={desdePedido}
        planes={planes.map((pl) => ({ slug: pl.slug, nombre: pl.nombre, precio: BS.format(pl.priceCents / 100) }))}
      />
      <p className="mt-6 text-[12px] text-ink-mute">
        ¿Buscas un evento que ya existe?{' '}
        <Link className="text-ink underline underline-offset-2" href={cerrar}>
          Vuelve a la cartera
        </Link>
      </p>
    </PanelLateral>
  )
}
