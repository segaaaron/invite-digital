import Link from 'next/link'
import { INTL } from '@/shared/i18n/t'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'
import { admin, events, leads, opinionesDe, orders } from '@/app/composition/container'
import { generarReferidoAction } from '@/app/_acciones/admin/clientes-actions'
import { requireAdmin } from '@/app/_acciones/sesion'
import { agruparClientes, clavesDeNota, ETAPAS_DE_CLIENTE, etapaDeCliente, eventoPrincipal, filtrarClientes, lineaDeTiempo, tieneContacto, valorDeCliente, type Cliente, type EtapaDeCliente } from '@/modules/admin/domain/clientes'
import { ETIQUETAS_SUGERIDAS } from '@/modules/admin/application/clientes-use-cases'
import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { NotaDeCliente, PublicarOpinion } from '@/modules/admin/ui/NotaDeCliente'
import { opinionPublicada } from '@/modules/admin/domain/site-settings'
import { BorrarCuentaDeCliente } from '@/modules/admin/ui/UserAdmin'
import { fiestaDeTema } from '@/modules/events'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { BRAND } from '@/shared/config/brand'
import { env } from '@/shared/config/env'
import { CheckIcon, MailIcon, SearchIcon, WhatsAppIcon, ArrowLeftIcon } from '@/shared/design/ui/icons'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { nombreDeFiesta, type FiestaDeLista } from '@/shared/design/ui/panel/lista'
import { Iniciales, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { diaCorto, diaDelEvento, hace } from '@/shared/format/fecha'
import { plural } from '@/shared/format/plural'
import { formatAmount } from '@/shared/money'
import { isErr } from '@/shared/result'
import { enlaceWhatsapp } from '@/shared/whatsapp'
import { traducir } from '@/shared/i18n/en-ingles'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Clientes · Administración', 'Clients · Administration') }
}
export const dynamic = 'force-dynamic'

const BASE = '/dashboard/admin/clients'
const PAGINA = 30

type Params = { [K in 'q' | 'etapa' | 'cliente' | 'de' | 'evento' | 'n']?: string | undefined }

/**
 * **Clientes: la persona entera**, y solo quien compra o pregunta —el personal vive en Ajustes ›
 * Equipo—. Consultas, pedidos, pagos, eventos y su cuenta, unidos por correo o teléfono
 * (`agruparClientes`), con **su etapa bien dicha** (quien pidió un plan sin pagar ya no es
 * «Comprador»), lo que ha pagado, su nota y sus etiquetas, y los referidos que trajo.
 *
 * La ficha se abre con `?cliente=<clave>` o, desde una venta, con `?de=<correo o teléfono>`.
 */
export default async function ClientesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  await requireAdmin()
  const p = await searchParams
  const ahora = new Date()
  const hoy = fechaEnBolivia(ahora)

  const [consultas, pedidos, usuarios, eventos] = await Promise.all([
    leads.list(null),
    orders.page({ status: null, tope: 2000, prioridad: ['approved'] }),
    admin.users(),
    admin.events(),
  ])
  if (isErr(consultas) || isErr(pedidos) || isErr(usuarios) || isErr(eventos)) {
    return (
      <>
        <PanelHeader kicker={t('Clientes', 'Clients')} title={t('Clientes', 'Clients')} />
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            {t('No pudimos leer los clientes. La base no responde; vuelve a intentarlo en un momento.', 'We could not read the clients. The database is not responding; try again in a moment.')}
          </p>
        </PanelCard>
      </>
    )
  }
  const anfitriones = await events.staff.hostsOf(eventos.value.map((e) => e.id))
  const eventoPorSlug = new Map(eventos.value.map((e) => [e.slug, e]))

  const todos = agruparClientes({
    consultas: consultas.value.filas,
    pedidos: pedidos.value.pedidos.map(({ order: o }) => ({
      publicRef: o.publicRef,
      customerName: o.customerName,
      contact: o.contact,
      status: o.status,
      createdAt: o.createdAt,
      decidedAt: o.decidedAt,
      eventSlug: o.eventSlug,
      amountCents: o.amountCents,
      producto: o.addonSlug === null ? (o.planName ?? t('Plan retirado', 'Withdrawn plan')) : `Extra · ${o.addonName ?? o.addonSlug}`,
    })),
    cuentas: usuarios.value.filter((u) => u.role === 'cliente').map((u) => ({ email: u.email, phone: null, createdAt: u.createdAt, nombre: u.fullName ?? null })),
    eventos: eventos.value.map((e) => ({ slug: e.slug, title: e.title, eventDate: e.eventDate, anfitriones: anfitriones.get(e.id) ?? [] })),
  })

  const etapa = ETAPAS_DE_CLIENTE.find((e) => e.clave === p.etapa)?.clave ?? 'todos'
  const q = p.q ?? ''
  const conEtapa = todos.map((c) => ({ c, etapa: etapaDeCliente(c, hoy) }))
  const encontrados = filtrarClientes(todos, q)
  const visibles = conEtapa.filter(({ c, etapa: e }) => encontrados.includes(c) && (etapa === 'todos' || e === etapa))
  const tope = Number(p.n) > 0 ? Math.min(Number(p.n), 1000) : PAGINA
  const pagina = visibles.slice(0, tope)
  const conteo = new Map<EtapaDeCliente, number>()
  for (const { etapa: e } of conEtapa) conteo.set(e, (conteo.get(e) ?? 0) + 1)

  const enlace = (cambio: Params) => {
    const actual: Params = { q: q === '' ? undefined : q, etapa: etapa === 'todos' ? undefined : etapa, ...cambio }
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(actual)) if (v !== undefined && v !== '') params.set(k, v)
    const cadena = params.toString()
    return cadena === '' ? BASE : `${BASE}?${cadena}`
  }

  // La ficha: por su clave, por un contacto (desde una venta) o por uno de sus eventos (desde «Hoy»).
  const ficha =
    p.cliente !== undefined
      ? todos.find((c) => c.clave === p.cliente)
      : p.de !== undefined
        ? todos.find((c) => tieneContacto(c, p.de ?? ''))
        : p.evento !== undefined
          ? todos.find((c) => c.eventos.some((e) => e.slug === p.evento))
          : undefined
  const fiestaDe = (c: Cliente): FiestaDeLista => {
    const ev = eventoPrincipal(c, hoy)
    const fila = ev === null ? undefined : eventoPorSlug.get(ev.slug)
    return fila === undefined ? null : fiestaDeTema(fila.themeKey)
  }

  // En la computadora siempre hay una ficha abierta (la pedida o la primera de la lista); en el celular, solo la pedida.
  const abierta = ficha ?? pagina[0]?.c
  const etiquetaDe = (e: EtapaDeCliente) => ETAPAS_DE_CLIENTE.find((x) => x.clave === e) ?? ETAPAS_DE_CLIENTE[0]
  const chips: { key: string; label: string; n: number }[] = [
    { key: 'todos', label: 'Todos', n: todos.length },
    { key: 'cliente', label: 'Con evento', n: conteo.get('cliente') ?? 0 },
    ...((conteo.get('pidio_plan') ?? 0) > 0 ? [{ key: 'pidio_plan', label: 'Pidieron plan', n: conteo.get('pidio_plan') ?? 0 }] : []),
    { key: 'prospecto', label: 'Consultas', n: conteo.get('prospecto') ?? 0 },
    { key: 'celebrado', label: 'Celebrados', n: conteo.get('celebrado') ?? 0 },
    ...((conteo.get('perdido') ?? 0) > 0 ? [{ key: 'perdido', label: 'Perdidos', n: conteo.get('perdido') ?? 0 }] : []),
  ]

  return (
    <>
      <div className={ficha === undefined ? '' : 'max-[767px]:hidden'}>
        <PanelHeader meta={t('Cada persona una sola vez: sus consultas, pedidos y eventos juntos.', 'Each person only once: their inquiries, orders and events together.')} title={t('Clientes', 'Clients')} />
        {/* Buscador y etapas en una línea (maqueta E04). */}
        <div className="mb-7 flex flex-wrap items-center gap-2.5">
          <form action={BASE} className="relative min-w-0 flex-[1_1_280px]" method="get" role="search">
            {etapa === 'todos' ? null : <input name="etapa" type="hidden" value={etapa} />}
            <label className="sr-only" htmlFor="buscar-cliente">
              {t('Buscar cliente', 'Search client')}
            </label>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ink-mute" />
            <input
              className="h-[46px] w-full rounded-[8px] border border-line-panel-strong bg-bg-raised pr-3.5 pl-10.5 text-[15px] outline-none focus:border-gold focus:shadow-[0_0_0_3px_rgb(var(--color-gold-rgb)/0.22)]"
              defaultValue={q}
              id="buscar-cliente"
              name="q"
              placeholder={t('Nombre, correo o teléfono', 'Name, email or phone')}
              type="search"
            />
          </form>
          <nav aria-label={t('Etapa', 'Stage')} className="flex flex-wrap gap-2.5">
            {chips.map((f) => (
              <Link
                aria-current={etapa === f.key ? 'page' : undefined}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-medium no-underline max-[859px]:min-h-11 ${etapa === f.key ? 'border-shell-deep bg-shell-deep text-shell-ink' : 'border-line-panel-strong bg-bg-raised text-ink hover:border-gold'}`}
                href={enlace({ etapa: f.key === 'todos' ? undefined : f.key, n: undefined, cliente: undefined })}
                key={f.key}
              >
                {traducir(f.label, t)} {f.n}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-label={t('Lista de clientes', 'Client list')} className={`min-w-0 flex-[1_1_320px] overflow-hidden rounded-[16px] border border-line-panel bg-bg-raised ${ficha === undefined ? '' : 'max-[767px]:hidden'}`}>
          {pagina.length === 0 ? (
            <div className="p-6">
              <EmptyState
                compact
                description={q === '' ? t('Aparecen en cuanto alguien escribe desde la web, pide un plan o recibe su cuenta.', 'They appear as soon as someone writes from the website, orders a plan or gets their account.') : t('Prueba con otra parte del nombre, el correo o los últimos dígitos del teléfono.', 'Try another part of the name, the email or the last digits of the phone.')}
                title={q === '' ? t('Nadie en esta etapa', 'Nobody at this stage') : t(`Nadie coincide con «${q}»`, `Nobody matches “${q}”`)}
              />
            </div>
          ) : (
            <>
              <ul>
                {pagina.map(({ c, etapa: e }) => {
                  const ev = eventoPrincipal(c, hoy)
                  const et = etiquetaDe(e)
                  const activa = abierta?.clave === c.clave
                  const fiesta = fiestaDe(c)
                  return (
                    <li className="border-b border-line-panel last:border-b-0" key={c.clave}>
                      <Link
                        aria-current={activa ? 'true' : undefined}
                        className={`flex items-center gap-3 px-4 py-3.5 text-ink no-underline transition-colors hover:bg-fila ${activa ? 'min-[768px]:bg-fila min-[768px]:shadow-[inset_3px_0_0_var(--color-gold)]' : ''}`}
                        href={enlace({ cliente: c.clave })}
                        scroll={false}
                      >
                        <Iniciales chico nombre={c.nombre} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{c.nombre}</span>
                          <span className="block truncate text-[13px] text-ink-mute">
                            {ev === null ? t(`Escribió ${hace(c.ultima, ahora, locale)}`, `Wrote ${hace(c.ultima, ahora, locale)}`) : `${nombreDeFiesta(fiesta, t)}, ${diaDelEvento(ev.eventDate, locale)}`}
                          </span>
                        </span>
                        <Pill tone={et.tono}>{e === 'cliente' ? t('Con evento', 'With event') : e === 'prospecto' ? t('Consulta', 'Inquiry') : traducir(et.etiqueta, t)}</Pill>
                      </Link>
                    </li>
                  )
                })}
              </ul>
              {visibles.length > pagina.length ? (
                <div className="border-t border-line-panel py-3 text-center">
                  <Link className="inline-flex min-h-11 items-center text-[14px] font-medium" href={enlace({ n: String(tope + PAGINA) })}>
                    {t('Ver', 'See')} {plural(Math.min(PAGINA, visibles.length - pagina.length), t('cliente más', 'more client'), t('clientes más', 'more clients'))}
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </section>

        {abierta === undefined ? null : (
          <div className={`flex min-w-0 flex-[2_1_460px] ${ficha === undefined ? 'max-[767px]:hidden' : ''}`} data-sin-isla={ficha === undefined ? undefined : ''}>
            <Ficha
              ahora={ahora}
              cerrar={enlace({})}
              cliente={abierta}
              cuenta={usuarios.value.find((u) => u.role === 'cliente' && abierta.correos.includes(u.email.toLowerCase())) ?? null}
              eventoPorSlug={eventoPorSlug}
              fiesta={fiestaDe(abierta)}
              hoy={hoy}
            />
          </div>
        )}
      </div>
    </>
  )
}

async function Ficha({
  cliente: c,
  cerrar,
  hoy,
  ahora,
  eventoPorSlug,
  cuenta,
}: {
  /** Su cuenta de cliente, si la tiene: para borrarla desde aquí. */
  cuenta: { readonly id: string; readonly email: string } | null
  cliente: Cliente
  cerrar: string
  hoy: string
  ahora: Date
  fiesta: FiestaDeLista
  eventoPorSlug: ReadonlyMap<string, { id: string; themeKey: string }>
}) {
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  const etapa = ETAPAS_DE_CLIENTE.find((x) => x.clave === etapaDeCliente(c, hoy)) ?? ETAPAS_DE_CLIENTE[0]
  const claves = clavesDeNota(c)
  const eventosConId = c.eventos.map((e) => ({ ...e, id: eventoPorSlug.get(e.slug)?.id ?? null }))
  const ids = eventosConId.map((e) => e.id).filter((x): x is string => x !== null)
  const [nota, codigos, opiniones, laWeb] = await Promise.all([admin.clientNote(claves), admin.referralCodesOf(ids), opinionesDe(ids), admin.siteSettings()])
  const usos = await admin.referralUses([...codigos.values()])
  const telefono = c.telefonos[0]
  const whatsapp = telefono === undefined ? null : enlaceWhatsapp(telefono, `Hola ${c.nombre.split(' ')[0] ?? c.nombre}, te escribimos de ${BRAND.siteName}.`)
  const correo = c.correos[0]
  const valor = valorDeCliente(c)
  const principal = eventoPrincipal(c, hoy)
  const sitio = env.SITE_URL.replace(/\/$/, '')

  return (
    // La ficha de la maqueta (E04): quién es y cómo escribirle, su historia y lo que sabemos de ella.
    <section aria-labelledby="ficha-de-cliente" className="flex w-full min-w-0 flex-col gap-6 rounded-[16px] border border-line-panel bg-bg-raised p-7 max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:bg-transparent max-[767px]:p-0">
      <Link className="mb-1 flex min-h-15 items-center gap-2 rounded-[18px] border border-line-panel bg-bg-raised px-1.5 text-ink no-underline shadow-[0_8px_24px_-14px_rgb(12_36_32/0.28)] min-[768px]:hidden" href={cerrar}>
        <span aria-hidden className="grid size-11 shrink-0 place-items-center">
          <ArrowLeftIcon className="size-5" />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[13px] text-ink-mute">{t('Clientes', 'Clients')}</span>
          <span className="truncate text-[16px] font-medium">{c.nombre}</span>
        </span>
        <span className="sr-only">{t(': volver', ': back')}</span>
      </Link>
      <div className="flex flex-wrap items-center gap-4">
        <Iniciales nombre={c.nombre} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[28px] leading-tight font-medium break-words" id="ficha-de-cliente">
            {c.nombre}
          </h2>
          <p className="text-[13.5px] text-ink-mute">{[...c.correos, ...c.telefonos].join(', ') || t('Sin contacto', 'No contact')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {whatsapp === null ? null : (
            <a className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-whatsapp px-4 text-[14.5px] font-medium text-white no-underline hover:bg-whatsapp-hover" href={whatsapp} rel="noopener noreferrer" target="_blank">
              <WhatsAppIcon className="size-[18px]" /> WhatsApp
            </a>
          )}
          {correo === undefined ? null : (
            <PanelButton href={`mailto:${correo}`}>
              <MailIcon className="size-4" /> {t('Correo', 'Email')}
            </PanelButton>
          )}
        </div>
      </div>

      <div aria-hidden className="h-[3px] border-y border-grab-borde" />

      <section aria-labelledby="su-historia">
        <h3 className="mb-2 font-medium" id="su-historia">
          {t('Su historia', 'Their history')}
        </h3>
        <ol>
          {lineaDeTiempo(c)
            .toReversed()
            .map((h, i) => (
              <li className="flex items-baseline gap-4 border-b border-line-panel py-3 last:border-b-0" key={`${h.texto}-${i}`}>
                {/* Lo que viene (el día de su evento) se dice con su fecha: «hace» de una fecha futura salía «ahora». */}
                <span className="w-16 shrink-0 text-[13px] text-ink-mute">{h.cuando.getTime() > ahora.getTime() ? new Intl.DateTimeFormat(INTL[locale], { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(h.cuando).replace('.', '') : hace(h.cuando, ahora, locale).replace('hace ', '').replace(/ ago$/, '')}</span>
                {h.href === null ? (
                  <span className="min-w-0 flex-1 text-[14.5px]">{traducir(h.texto, t)}</span>
                ) : (
                  <Link className="flex min-h-11 min-w-0 flex-1 items-center text-[14.5px] text-ink" href={h.href}>
                    {traducir(h.texto, t)}
                  </Link>
                )}
              </li>
            ))}
        </ol>
        {principal === null ? null : (
          <p className="mt-2 text-[13.5px] text-ink-mute">
            {t('Etapa:', 'Stage:')} {traducir(etapa.etiqueta, t)}
            {valor === 0 ? '' : t(`, ${formatAmount(valor, 'BOB')} pagado`, `, ${formatAmount(valor, 'BOB')} paid`)}
          </p>
        )}
      </section>

      <div aria-hidden className="h-[3px] border-y border-grab-borde" />

      <section aria-labelledby="notas-de-cliente">
        <h3 className="mb-2 font-medium" id="notas-de-cliente">
          {t('Notas', 'Notes')}
        </h3>
        <NotaDeCliente clave={claves[0] ?? ''} etiquetas={nota.ok ? (nota.value?.tags ?? []) : []} nombre={c.nombre} nota={nota.ok ? (nota.value?.note ?? null) : null} sugeridas={ETIQUETAS_SUGERIDAS} />
      </section>

      <details className="group rounded-[12px] border border-line-panel">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-[14.5px] font-medium [&::-webkit-details-marker]:hidden">
          {t('Sus eventos, referidos y cuenta', 'Their events, referrals and account')}
          <span aria-hidden className="text-ink-mute transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="flex flex-col gap-5 border-t border-line-panel px-4 py-4">
        <Bloque titulo={t('Contacto', 'Contact')}>
          <dl className="grid gap-4 min-[480px]:grid-cols-2">
            <Dato etiqueta={t('Correo', 'Email')}>{c.correos.join(', ') || '—'}</Dato>
            <Dato etiqueta={t('Teléfono', 'Phone')}>{c.telefonos.join(', ') || '—'}</Dato>
            <Dato etiqueta={t('Cuenta en el panel', 'Panel account')}>{c.cuenta ? t('Sí, entra con su correo', 'Yes, signs in with their email') : t('No tiene', 'None')}</Dato>
            <Dato etiqueta={t('Su acceso', 'Their access')}>{c.eventos.length === 0 ? '—' : t('Se gestiona en la ficha de su evento', 'Managed in their event record')}</Dato>
          </dl>
          {cuenta === null ? null : (
            <div className="mt-4">
              <BorrarCuentaDeCliente email={cuenta.email} userId={cuenta.id} />
            </div>
          )}
        </Bloque>

        {eventosConId.length === 0 ? null : (
          <Bloque titulo={t('Sus eventos y referidos', 'Their events and referrals')}>
            <ul className="flex flex-col gap-2.5">
              {eventosConId.map((e) => {
                const codigo = e.id === null ? undefined : codigos.get(e.id)
                return (
                  <li className="flex flex-col gap-2.5 rounded-[16px] border border-line-panel bg-white px-4 py-3.5" key={e.slug}>
                    <div className="flex items-center justify-between gap-3">
                      <Link className="flex min-h-11 min-w-0 items-center truncate font-display text-[17px] text-ink hover:underline" href={`/dashboard/events/${e.slug}/setup`}>
                        {e.title}
                      </Link>
                      <span className="shrink-0 text-[12px] text-ink-mute">{diaCorto(e.eventDate, hoy, locale)}</span>
                    </div>
                    {(() => {
                      const o = e.id === null ? undefined : opiniones.get(e.id)
                      return o?.rating == null ? null : (
                        <div className="rounded-[12px] bg-gold/8 px-3 py-2 text-[12.5px] text-ink">
                          <b className="font-medium">{t(`${o.rating} de 5`, `${o.rating} of 5`)}</b>
                          {o.comment === null ? null : <span className="text-ink-soft"> · «{o.comment}»</span>}
                          {o.allowPublish ? <span className="block text-[12px] text-ink-mute">{t('Deja publicar su opinión en la web', 'Allows publishing their review on the website')}</span> : null}
                          {o.allowPublish && o.comment !== null && !isErr(laWeb) && opinionPublicada(laWeb.value, o.comment) ? (
                            <span className="mt-1.5 flex items-center gap-1.5 text-[12px] text-sage-deep">
                              <CheckIcon className="size-3.5" /> {t('Publicada en la web', 'Published on the website')}
                            </span>
                          ) : o.allowPublish && o.comment !== null && e.id !== null ? (
                            <div className="mt-2">
                              <PublicarOpinion autor={c.nombre.trim().split(/\s+/)[0] ?? c.nombre} eventId={e.id} rol={nombreDeFiesta(fiestaDeTema(eventoPorSlug.get(e.slug)?.themeKey ?? ''), t)} />
                            </div>
                          ) : null}
                        </div>
                      )
                    })()}
                    {codigo === undefined ? (
                      e.id === null ? null : (
                        <form action={generarReferidoAction}>
                          <input name="eventId" type="hidden" value={e.id} />
                          <button className="text-[12.5px] text-ink-soft underline underline-offset-4 hover:text-ink" type="submit">
                            {t('Darle su código de recomendación', 'Give them their referral code')}
                          </button>
                        </form>
                      )
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
                        <span className="text-ink-soft">
                          {t('Código', 'Code')} <b className="font-codigo font-medium tracking-[0.12em] text-ink">{codigo}</b>
                        </span>
                        <span className="text-ink-mute">{plural(usos.get(codigo) ?? 0, t('compra con su código', 'purchase with their code'), t('compras con su código', 'purchases with their code'))}</span>
                        <span className="w-full truncate font-codigo text-[12px] text-ink-mute">{`${sitio}/es?ref=${codigo}#planes`}</span>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </Bloque>
        )}

          <PanelButton href="/dashboard/admin/sales?crear=cotizacion">{t('Nueva cotización', 'New quote')}</PanelButton>
        </div>
      </details>
    </section>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 font-mono text-[12px] tracking-[0.18em] text-ink-mute uppercase">{titulo}</h3>
      {children}
    </section>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[12px] font-medium tracking-[0.1em] text-ink-mute uppercase">{etiqueta}</dt>
      <dd className="text-[14px] break-words text-ink">{children}</dd>
    </div>
  )
}
