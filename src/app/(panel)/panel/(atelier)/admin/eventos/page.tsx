import Link from 'next/link'
import { admin, events, leads, orders } from '@/app/composition/container'
import { ETAPAS, etapaDe, ordenarCartera, type Etapa } from '@/modules/admin/domain/cartera'
import { diasEntre, fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { saludDelEvento } from '@/modules/admin/domain/salud'
import { NuevaBodaForm, type DesdePedido } from '@/modules/admin'
import { EventAdminRow, type EventAdminView } from '@/modules/admin/ui/EventAdminRow'
import { COLUMNAS_DE_CARTERA } from '@/modules/admin/ui/columnas-de-cartera'
import { themeDefinitions } from '@/modules/events/ui/themes/registry'
import { CATALOG_KEYS, seAsigna } from '@/shared/design/theme-catalog'
import { fiestaDeTema, vocabularioDeCategoria } from '@/modules/events'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { Semaforo, type FiestaDeLista } from '@/shared/design/ui/panel/lista'
import { SearchIcon } from '@/shared/design/ui/icons'
import { PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { EntrarComoCliente } from '@/modules/admin/ui/EntrarComoCliente'
import { PanelLateral } from '@/shared/design/ui/panel/PanelLateral'
import { faltaPara, diaDelEvento } from '@/shared/format/fecha'
import { plural } from '@/shared/format/plural'
import { isErr } from '@/shared/result'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { traducir } from '@/shared/i18n/en-ingles'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Eventos · Administración', 'Events · Administration') }
}
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

type Params = { [K in 'etapa' | 'fiesta' | 'q' | 'n' | 'crear' | 'pedido' | 'consulta' | 'evento' | 'ver']?: string | undefined }

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
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  await requireAdmin()
  const p = await searchParams
  const hoy = fechaEnBolivia(new Date())

  const [eventos, planes] = await Promise.all([admin.events(), admin.planOptions()])
  if (isErr(eventos)) {
    return (
      <>
        <PanelHeader kicker={t('Eventos', 'Events')} title={t('Cartera', 'Portfolio')} />
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            {t('No pudimos leer los eventos. La base no responde; vuelve a intentarlo en un momento.', 'We could not read the events. The database is not responding; try again in a moment.')}
          </p>
        </PanelCard>
      </>
    )
  }

  const temas = themeDefinitions()
  const nombreDeModelo = new Map(temas.map((tema) => [tema.key, tema.label]))
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
      (filtroEtapa === 'todas' ? e.etapa !== 'celebrada' : filtroEtapa === 'riesgo' ? e.salud.tono !== 'ok' : e.etapa === filtroEtapa) &&
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
  const enRiesgo = deFiesta.filter((e) => e.salud.tono !== 'ok').length
  const celebrados = deFiesta.filter((e) => e.etapa === 'celebrada').length
  const semana = deFiesta.filter((e) => {
    const d = diasEntre(hoy, e.eventDate)
    return d >= 0 && d <= 7
  }).length
  const esteMes = deFiesta.filter((e) => e.eventDate.slice(0, 7) === hoy.slice(0, 7) && e.eventDate >= hoy).length
  const conRespuestas = deFiesta.filter((e) => e.etapa !== 'celebrada' && e.personas > 0)
  const media = conRespuestas.length === 0 ? null : Math.round((conRespuestas.reduce((s2, e) => s2 + e.personasRespondieron / e.personas, 0) / conRespuestas.length) * 100)
  // «Necesitan algo» dice cuáles: el número y el detalle hablan de lo mismo (antes, el detalle contaba borradores).
  const enRiesgoNombres = deFiesta.filter((e) => e.salud.tono !== 'ok').map((e) => e.title)
  const resumenRiesgo = enRiesgoNombres.length <= 2 ? enRiesgoNombres.join(t(' y ', ' and ')) : t(`${enRiesgoNombres.slice(0, 2).join(', ')} y ${enRiesgoNombres.length - 2} más`, `${enRiesgoNombres.slice(0, 2).join(', ')} and ${enRiesgoNombres.length - 2} more`)
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
    modelo: nombreDeModelo.get(e.themeKey) ?? null,
    fiesta: e.fiesta,
    grupos: e.grupos,
    enviados: e.enviados,
    respondidos: e.respondidos,
    personas: e.personas,
    personasRespondieron: e.personasRespondieron,
    etapa: e.etapa,
    cuando: faltaPara(diasEntre(hoy, e.eventDate), locale),
    salud: { tono: e.salud.tono, texto: traducir(e.salud.texto, t), mas: Math.max(0, e.salud.alertas.length - 1) },
    anfitriones: anfitriones.get(e.id) ?? [],
  })

  const abierto = p.evento === undefined ? undefined : cartera.find((e) => e.slug === p.evento)

  // El alta es su propia página (maqueta E51), en lugar de la cartera.
  if (p.crear === 'evento') return <AltaDeEvento cerrar={enlace({})} consultaId={p.consulta} pedidoRef={p.pedido} temas={temas} planes={planes} />

  return (
    <>
      <PanelHeader meta={t('Lo que se celebra pronto va primero. Abre uno para ver su ficha o entra como anfitrión.', 'What is celebrated soon comes first. Open one to see its record or enter as the host.')} title={t('Eventos', 'Events')} />

      {/* Buscador y filtros en una línea (maqueta E03). */}
      <div className="mb-7 flex flex-wrap items-center gap-2.5">
        <form action={BASE} className="relative min-w-0 flex-[1_1_280px] max-[1279px]:hidden" method="get" role="search">
          {filtroEtapa === 'todas' ? null : <input name="etapa" type="hidden" value={filtroEtapa} />}
          <label className="sr-only" htmlFor="buscar-evento">
            {t('Buscar evento', 'Search event')}
          </label>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ink-mute" />
          <input
            className="h-[46px] w-full rounded-[8px] border border-line-panel-strong bg-bg-raised pr-3.5 pl-10.5 text-[15px] outline-none focus:border-gold focus:shadow-[0_0_0_3px_rgb(var(--color-gold-rgb)/0.22)]"
            defaultValue={q}
            id="buscar-evento"
            name="q"
            placeholder={t('Buscar por nombre, cliente o diseño', 'Search by name, client or design')}
            type="search"
          />
        </form>
        <nav aria-label={t('Etapa', 'Stage')} className="flex flex-wrap gap-2.5">
          {[
            { key: 'todas', label: 'Próximos', n: deFiesta.length - celebrados },
            ...(enRiesgo > 0 || filtroEtapa === 'riesgo' ? [{ key: 'riesgo', label: t('Necesitan algo', 'Need something'), n: enRiesgo }] : []),
            { key: 'borrador', label: t('Borradores', 'Drafts'), n: conteo.get('borrador') ?? 0 },
            { key: 'sin_invitados', label: t('Sin invitados', 'No guests'), n: conteo.get('sin_invitados') ?? 0 },
            { key: 'celebrada', label: t('Celebrados', 'Celebrated'), n: celebrados },
          ].map((f) => (
            <Link
              aria-current={filtroEtapa === f.key ? 'page' : undefined}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-medium no-underline max-[859px]:min-h-11 ${filtroEtapa === f.key ? 'border-shell-deep bg-shell-deep text-shell-ink' : 'border-line-panel-strong bg-bg-raised text-ink hover:border-gold'}`}
              href={enlace({ etapa: f.key === 'todas' ? undefined : f.key, n: undefined })}
              key={f.key}
            >
              {traducir(f.label, t)} {f.n}
            </Link>
          ))}
        </nav>
      </div>

      {/* Las cifras en su tira con filetes (maqueta E03). */}
      <dl className="mb-9 flex flex-wrap gap-y-4 max-[1279px]:hidden">
        <CifraDeTira etiqueta={t('Esta semana', 'This week')} valor={semana === 1 ? t('1 evento', '1 event') : t(`${semana} eventos`, `${semana} events`)} primera />
        <CifraDeTira detalle={enRiesgo === 0 ? undefined : resumenRiesgo} enlace={enRiesgo === 0 ? undefined : enlace({ etapa: 'riesgo', n: undefined })} etiqueta={t('Necesitan algo', 'Need something')} valor={String(enRiesgo)} />
        <CifraDeTira etiqueta={t('Confirmación media', 'Average RSVP')} valor={media === null ? '—' : `${media}%`} />
        <CifraDeTira etiqueta={t('Este mes', 'This month')} valor={String(esteMes)} />
      </dl>

      {/* Tableta (maqueta T03): la lista a la izquierda y la ficha del elegido al lado, con lo que falta y cómo entrar. */}
      {(() => {
        const elegido = pagina.find((e) => e.slug === p.ver) ?? pagina[0]
        if (elegido === undefined) return null
        const ev = vista(elegido)
        const tono = { ok: 'ok', warn: 'pending', risk: 'no' } as const
        return (
          <div className="mb-8 hidden min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-6 min-[768px]:max-[1279px]:grid">
            <ul className="min-w-0 border-t border-line-panel">
              {pagina.map((e) => {
                const activa = e.slug === elegido.slug
                const dias = diasEntre(hoy, e.eventDate)
                return (
                  <li className="border-b border-line-panel" key={e.id}>
                    <Link
                      aria-current={activa ? 'true' : undefined}
                      className={`flex min-h-[76px] items-center gap-3.5 px-3 py-3 text-ink no-underline ${activa ? 'bg-bg-raised shadow-[inset_3px_0_0_var(--color-gold)]' : 'hover:bg-fila'}`}
                      href={enlace({ ver: e.slug })}
                      scroll={false}
                    >
                      <span className="grid h-12 w-10 shrink-0 place-items-center overflow-hidden rounded-[6px] bg-bg-sunken">
                        {CATALOG_KEYS.includes(e.themeKey) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt="" className="size-full object-cover" loading="lazy" src={`/templates/${e.themeKey}.avif`} />
                        ) : null}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate font-display text-[19px] leading-tight font-medium">{e.title}</span>
                        <span className="truncate text-[13px] text-ink-mute">{diaDelEvento(e.eventDate, locale)}</span>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-mute">
                          {/* Corto: la razón entera va en la ficha de al lado; larga se montaba sobre ella. */}
                          <Pill tone={tono[e.salud.tono]}>{e.salud.tono === 'ok' ? t('Al día', 'On track') : t('Necesita algo', 'Needs something')}</Pill>
                          <span>{e.personas === 0 ? t('Sin invitados', 'No guests') : t(`${e.personasRespondieron} de ${e.personas} personas`, `${e.personasRespondieron} of ${e.personas} people`)}</span>
                        </span>
                      </span>
                      {dias < 0 ? null : (
                        <span className="shrink-0 text-center">
                          <span className="block font-display text-[24px] leading-none [font-variant-numeric:lining-nums]">{dias}</span>
                          <span className="text-[12px] text-ink-mute">{dias === 1 ? 'día' : 'días'}</span>
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
            <section aria-label={t(`Ficha de ${ev.title}`, `${ev.title} record`)} className="sticky top-24 flex flex-col gap-5 self-start">
              <div className="flex gap-5">
                <span className="block w-28 shrink-0 overflow-hidden rounded-[16px] border-4 border-shell-deep bg-bg-sunken">
                  {ev.portada === null ? null : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="aspect-[9/16] w-full object-cover" src={ev.portada} />
                  )}
                </span>
                <div className="flex min-w-0 flex-col gap-2">
                  <h2 className="font-display text-[28px] leading-tight font-medium">{ev.title}</h2>
                  <p className="text-[14.5px] text-ink-mute">
                    {ev.modelo === null ? t('Con un diseño retirado', 'With a withdrawn design') : `${t('Con el diseño', 'With the design')} ${ev.modelo}`}
                    {ev.planNombre === null ? '' : t(`, plan ${ev.planNombre}`, `, ${ev.planNombre} plan`)}. {diaDelEvento(ev.eventDate, locale)}.
                  </p>
                  <span className="flex flex-wrap gap-2">
                    <Pill tone={tono[ev.salud.tono]}>{ev.salud.tono === 'ok' ? t('Al día', 'On track') : t('Necesita algo', 'Needs something')}</Pill>
                    <Pill tone="neutro">{ev.cuando}</Pill>
                  </span>
                </div>
              </div>
              <dl className="grid grid-cols-3 border-y border-line-panel">
                {[
                  { n: ev.personas, t: t('personas', 'people') },
                  { n: ev.personasRespondieron, t: t('respondieron', 'replied') },
                  { n: `${ev.enviados}/${ev.grupos}`, t: t('invitaciones enviadas', 'invitations sent') },
                ].map((c, i) => (
                  <div className={`py-3.5 ${i === 0 ? '' : 'border-l border-line-panel pl-4'}`} key={c.t}>
                    <dd className="m-0 font-display text-[28px] leading-none font-medium [font-variant-numeric:lining-nums]">{c.n}</dd>
                    <dt className="mt-1 text-[13px] text-ink-mute">{c.t}</dt>
                  </div>
                ))}
              </dl>
              {elegido.salud.alertas.length === 0 ? null : (
                <div>
                  <h3 className="mb-2 text-[15px] font-medium">{t('Lo que falta', 'What is missing')}</h3>
                  <ul className="list-disc pl-5 text-[14.5px] leading-[1.7]">
                    {elegido.salud.alertas.map((a) => (
                      <li key={a.clave}>{traducir(a.texto, t)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {/* «Abrir el panel» y «Entrar al panel» decían casi lo mismo y hacían otra cosa (16 oct): la ficha se llama ficha. */}
              <div className="grid grid-cols-2 gap-2.5 max-[1023px]:grid-cols-1">
                <PanelButton href={`/panel/eventos/${ev.slug}/configuracion`} variant="primary">
                  {t('Ver la ficha', 'See the record')}
                </PanelButton>
                <EntrarComoCliente anfitriones={ev.anfitriones} eventId={ev.id} />
              </div>
            </section>
          </div>
        )
      })()}

      <div className="min-[768px]:max-[1279px]:hidden">
      <h2 className="mb-2 font-display text-[24px] font-medium max-[767px]:sr-only">{filtroEtapa === 'celebrada' ? t('Celebrados', 'Celebrated') : filtroEtapa === 'todas' ? t('Próximos', 'Upcoming') : t('Eventos', 'Events')}</h2>
      {visibles.length === 0 ? (
        <PanelCard>
          <EmptyState
            action={
              cartera.length === 0 ? (
                <PanelButton href={`${BASE}?crear=evento`} variant="primary">
                  {t('Crear el primer evento', 'Create the first event')}
                </PanelButton>
              ) : undefined
            }
            title={cartera.length === 0 ? t('Todavía no hay ningún evento en el sistema', 'There are no events in the system yet') : t('Ningún evento con ese filtro', 'No events with that filter')}
          />
        </PanelCard>
      ) : (
        <>
          <div aria-hidden className={`grid border-b border-line-panel-strong px-3.5 pb-2.5 text-[13px] font-medium text-ink-mute max-[859px]:hidden ${COLUMNAS_DE_CARTERA} gap-x-4`}>
            <span>{t('Fecha', 'Date')}</span>
            <span>{t('Evento', 'Event')}</span>
            <span>{t('Cliente', 'Client')}</span>
            <span>{t('Etapa', 'Stage')}</span>
            <span>{t('Avance', 'Progress')}</span>
            <span />
          </div>
          <ul className="flex flex-col">
            {pagina.map((e) => (
              <EventAdminRow event={vista(e)} key={e.id} />
            ))}
          </ul>
          {visibles.length > pagina.length ? (
            <div className="mt-4">
              <PanelButton href={enlace({ n: String(tope + PAGINA) })}>
                {t('Ver', 'See')} {plural(Math.min(PAGINA, visibles.length - pagina.length), t('evento más', 'more event'), t('eventos más', 'more events'))}
              </PanelButton>
            </div>
          ) : null}
        </>
      )}
      </div>

      {abierto === undefined ? null : (
        <PanelLateral closeHref={enlace({})} subtitle={`${diaDelEvento(abierto.eventDate, locale)} · ${faltaPara(diasEntre(hoy, abierto.eventDate), locale)}`} title={abierto.title}>
          <div className="flex flex-col gap-5">
            {/* `@container`: la fila decide sus columnas por el ancho de su lista, no por la ventana. */}
            <ul className="@container flex flex-col gap-2.5">
              <EventAdminRow event={vista(abierto)} />
            </ul>
            <section>
              <h3 className="mb-3 font-mono text-[12px] tracking-[0.18em] text-ink-mute uppercase">{t('Salud del evento', 'Event health')}</h3>
              {abierto.salud.alertas.length === 0 ? (
                <Semaforo tono="ok">{traducir(abierto.salud.texto, t)}</Semaforo>
              ) : (
                <ul className="flex flex-col gap-2">
                  {abierto.salud.alertas.map((a) => (
                    <li key={a.clave}>
                      <Semaforo tono={a.tono}>{traducir(a.texto, t)}</Semaforo>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="flex flex-wrap gap-2.5">
              <PanelButton href={`/panel/eventos/${abierto.slug}/configuracion`} variant="primary">
                {t('Abrir la ficha', 'Open the record')}
              </PanelButton>
              <PanelButton href={`/panel/eventos/${abierto.slug}/vista-previa`}>{t('Ver la invitación', 'See the invitation')}</PanelButton>
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
  const t = await tr()
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
    // Una página, no un panel (maqueta E51): «Eventos / Nuevo evento» arriba y el alta a lo ancho.
    <div className="flex flex-col gap-7">
      <header>
        <h1 className="font-display text-[46px] leading-[1.06] font-medium max-[559px]:text-[34px]">{t('Nuevo evento', 'New event')}</h1>
        <p className="mt-2 text-[17px] text-ink-mute max-[859px]:text-[16px]">
          {desdePedido === undefined
            ? t('Para un cliente que ya pagó o que cobras por fuera. Lo dejamos listo para que entre.', 'For a client who already paid or whom you bill outside. We leave it ready for them to sign in.')
            : desdePedido.ref === null
              ? t(`Desde la consulta de ${desdePedido.nombre}: sus datos ya están puestos.`, `From ${desdePedido.nombre}’s inquiry: their details are already filled in.`)
              : t(`Desde el pedido ${desdePedido.ref}: lo que eligió ya está puesto.`, `From order ${desdePedido.ref}: what they chose is already filled in.`)}
        </p>
      </header>
      <NuevaBodaForm
        cancelar={cerrar}
        // Ni el clásico —el respaldo de una clave desconocida— ni los retirados: nadie los elige mirando la web.
        modelos={temas.filter((tema) => seAsigna(tema.key)).map((tema) => ({ key: tema.key, label: tema.label, categoria: vocabularioDeCategoria(tema.categorySlug).plural }))}
        pedido={desdePedido}
        planes={planes.map((pl) => ({ slug: pl.slug, nombre: pl.nombre, precio: BS.format(pl.priceCents / 100) }))}
      />
    </div>
  )
}

/** Una cifra de la tira (maqueta `.kpi`): rótulo, número en Bodoni y su línea. */
function CifraDeTira({ etiqueta, valor, detalle, enlace, primera = false }: { etiqueta: string; valor: string; detalle?: string | undefined; enlace?: string | undefined; primera?: boolean }) {
  return (
    <div className={`flex-[1_1_160px] ${primera ? '' : 'border-l border-line-panel pl-6'}`}>
      <dt className="text-[13.5px] text-ink-mute">{etiqueta}</dt>
      <dd className="m-0 font-display text-[32px] leading-[1.15] font-medium">{valor}</dd>
      {detalle === undefined ? null : enlace === undefined ? (
        <dd className="m-0 text-[13px] text-pill-pending-ink">{detalle}</dd>
      ) : (
        <dd className="m-0 text-[13px]">
          <Link className="inline-flex min-h-11 items-center text-pill-pending-ink" href={enlace}>
            {detalle}
          </Link>
        </dd>
      )}
    </div>
  )
}
