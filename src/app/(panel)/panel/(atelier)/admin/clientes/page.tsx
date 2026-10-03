import Link from 'next/link'
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
import { CheckIcon, MailIcon, WhatsAppIcon } from '@/shared/design/ui/icons'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { BarraDeFiltros, EncabezadoDeLista, EtiquetaDeFiesta, FilaDeLista, Importe, Monograma, nombreDeFiesta, TiraDeCifras, type FiestaDeLista } from '@/shared/design/ui/panel/lista'
import { PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { PanelLateral } from '@/shared/design/ui/panel/PanelLateral'
import { diaCorto, diaDelEvento, fecha as fechaLarga, hace } from '@/shared/format/fecha'
import { plural } from '@/shared/format/plural'
import { formatAmount } from '@/shared/money'
import { isErr } from '@/shared/result'
import { enlaceWhatsapp } from '@/shared/whatsapp'

export const metadata = { title: 'Clientes · Administración' }
export const dynamic = 'force-dynamic'

const BASE = '/panel/admin/clientes'
const PAGINA = 30
const COLUMNAS = 'min-[860px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_130px_120px_110px]'

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
        <PanelHeader kicker="Clientes" title="Clientes" />
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los clientes. La base no responde; vuelve a intentarlo en un momento.
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
      producto: o.addonSlug === null ? (o.planName ?? 'Plan retirado') : `Extra · ${o.addonName ?? o.addonSlug}`,
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
  const valorTotal = todos.reduce((s, c) => s + valorDeCliente(c), 0)

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

  return (
    <>
      <PanelHeader kicker="Clientes" meta="Quien pregunta, compra o celebra con nosotros. El personal está en Ajustes › Equipo." title="Clientes" />

      <TiraDeCifras
        cifras={[
          { label: 'Clientes', value: conteo.get('cliente') ?? 0, detail: 'Con evento o pago aprobado', href: enlace({ etapa: 'cliente', n: undefined }) },
          { label: 'Pidieron plan', value: conteo.get('pidio_plan') ?? 0, detail: 'Esperando su pago', href: enlace({ etapa: 'pidio_plan', n: undefined }) },
          { label: 'Prospectos', value: conteo.get('prospecto') ?? 0, detail: 'Preguntaron, aún sin pedido', href: enlace({ etapa: 'prospecto', n: undefined }) },
          { label: 'Valor cobrado', value: formatAmount(valorTotal, 'BOB'), detail: 'Suma de lo aprobado' },
        ]}
      />

      <BarraDeFiltros
        actual={etapa}
        busqueda={{ accion: BASE, valor: q, placeholder: 'Nombre, correo o teléfono', ocultos: etapa === 'todos' ? {} : { etapa } }}
        etiqueta="Etapa"
        opciones={[
          { key: 'todos', label: 'Todos', href: enlace({ etapa: undefined, n: undefined }), count: todos.length },
          ...ETAPAS_DE_CLIENTE.map((e) => ({ key: e.clave, label: e.etiqueta, href: enlace({ etapa: e.clave, n: undefined }), count: conteo.get(e.clave) ?? 0 })),
        ]}
      />

      <PanelCard>
        {pagina.length === 0 ? (
          <EmptyState
            description={q === '' ? 'Aparecen en cuanto alguien escribe desde la web, pide un plan o recibe su cuenta.' : 'Prueba con otra parte del nombre, el correo o los últimos dígitos del teléfono.'}
            title={q === '' ? 'Nadie en esta etapa' : `Nadie coincide con «${q}»`}
          />
        ) : (
          <>
            <EncabezadoDeLista columnas={['Cliente', 'Su evento', 'Etapa', 'Valor', 'Actividad']} plantilla={COLUMNAS} />
            <ul className="-mx-1 mt-1 flex flex-col">
              {pagina.map(({ c, etapa: e }) => {
                const ev = eventoPrincipal(c, hoy)
                const et = ETAPAS_DE_CLIENTE.find((x) => x.clave === e) ?? ETAPAS_DE_CLIENTE[0]
                const valor = valorDeCliente(c)
                return (
                  <FilaDeLista
                    detalle={[...c.correos, ...c.telefonos].join(' · ') || 'Sin contacto'}
                    fiesta={fiestaDe(c)}
                    href={enlace({ cliente: c.clave })}
                    key={c.clave}
                    nombre={c.nombre}
                    plantilla={COLUMNAS}
                  >
                    <span className="min-w-0 truncate text-[12.5px] text-ink-soft max-[859px]:hidden">{ev === null ? '—' : `${ev.title} · ${diaCorto(ev.eventDate, hoy)}`}</span>
                    <span className="max-[859px]:col-start-2 max-[859px]:row-start-1 max-[859px]:justify-self-end">
                      <Pill tone={et.tono}>{et.etiqueta}</Pill>
                    </span>
                    <span className="font-display text-[15.5px] text-ink [font-variant-numeric:lining-nums] max-[859px]:hidden">{valor === 0 ? '—' : formatAmount(valor, 'BOB')}</span>
                    <span className="text-right text-[12px] text-ink-mute max-[859px]:hidden">{hace(c.ultima, ahora)}</span>
                  </FilaDeLista>
                )
              })}
            </ul>
            {visibles.length > pagina.length ? (
              <div className="mt-4">
                <PanelButton href={enlace({ n: String(tope + PAGINA) })}>Ver {plural(Math.min(PAGINA, visibles.length - pagina.length), 'cliente más', 'clientes más')}</PanelButton>
              </div>
            ) : null}
          </>
        )}
      </PanelCard>

      {ficha === undefined ? null : (
        <Ficha
          ahora={ahora}
          cerrar={enlace({})}
          cliente={ficha}
          cuenta={usuarios.value.find((u) => u.role === 'cliente' && ficha.correos.includes(u.email.toLowerCase())) ?? null}
          eventoPorSlug={eventoPorSlug}
          fiesta={fiestaDe(ficha)}
          hoy={hoy}
        />
      )}
    </>
  )
}

async function Ficha({
  cliente: c,
  cerrar,
  hoy,
  ahora,
  fiesta,
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
    <PanelLateral
      acciones={
        <>
          {whatsapp === null ? null : (
            <PanelButton external href={whatsapp} variant="primary">
              <WhatsAppIcon className="size-4" /> WhatsApp
            </PanelButton>
          )}
          {correo === undefined ? null : (
            <PanelButton href={`mailto:${correo}`}>
              <MailIcon className="size-4" /> Correo
            </PanelButton>
          )}
          <PanelButton href="/panel/admin/ventas?crear=cotizacion">Nueva cotización</PanelButton>
        </>
      }
      closeHref={cerrar}
      subtitle={`Última actividad ${hace(c.ultima, ahora)}`}
      title={c.nombre}
    >
      <div className="flex flex-col gap-7">
        <div className="flex items-start gap-4">
          <Monograma fiesta={fiesta} grande nombre={c.nombre} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={etapa.tono}>{etapa.etiqueta}</Pill>
              <EtiquetaDeFiesta fiesta={fiesta} />
              {(nota.ok ? (nota.value?.tags ?? []) : []).map((t) => (
                <span className="rounded-full bg-gold/12 px-2.5 py-0.5 font-mono text-[10px] tracking-[0.12em] text-gold-deep uppercase" key={t}>
                  {t}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[13px] text-ink-soft">{principal === null ? 'Sin evento todavía' : `${principal.title} · ${diaDelEvento(principal.eventDate)}`}</p>
          </div>
          {valor === 0 ? null : (
            <div className="shrink-0 text-right">
              <Importe texto={formatAmount(valor, 'BOB')} />
              <p className="mt-1 text-[11.5px] text-ink-mute">pagado</p>
            </div>
          )}
        </div>

        <Bloque titulo="Contacto">
          <dl className="grid gap-4 min-[480px]:grid-cols-2">
            <Dato etiqueta="Correo">{c.correos.join(', ') || '—'}</Dato>
            <Dato etiqueta="Teléfono">{c.telefonos.join(', ') || '—'}</Dato>
            <Dato etiqueta="Cuenta en el panel">{c.cuenta ? 'Sí, entra con su correo' : 'No tiene'}</Dato>
            <Dato etiqueta="Su acceso">{c.eventos.length === 0 ? '—' : 'Se gestiona en la ficha de su evento'}</Dato>
          </dl>
          {cuenta === null ? null : (
            <div className="mt-4">
              <BorrarCuentaDeCliente email={cuenta.email} userId={cuenta.id} />
            </div>
          )}
        </Bloque>

        <Bloque titulo="Lo que sabemos">
          <NotaDeCliente clave={claves[0] ?? ''} etiquetas={nota.ok ? (nota.value?.tags ?? []) : []} nombre={c.nombre} nota={nota.ok ? (nota.value?.note ?? null) : null} sugeridas={ETIQUETAS_SUGERIDAS} />
        </Bloque>

        {eventosConId.length === 0 ? null : (
          <Bloque titulo="Sus eventos y referidos">
            <ul className="flex flex-col gap-2.5">
              {eventosConId.map((e) => {
                const codigo = e.id === null ? undefined : codigos.get(e.id)
                return (
                  <li className="flex flex-col gap-2.5 rounded-[16px] border border-line-panel bg-white px-4 py-3.5" key={e.slug}>
                    <div className="flex items-center justify-between gap-3">
                      <Link className="min-w-0 truncate font-display text-[17px] text-ink hover:underline" href={`/panel/eventos/${e.slug}/configuracion`}>
                        {e.title}
                      </Link>
                      <span className="shrink-0 text-[12px] text-ink-mute">{diaCorto(e.eventDate, hoy)}</span>
                    </div>
                    {(() => {
                      const o = e.id === null ? undefined : opiniones.get(e.id)
                      return o?.rating == null ? null : (
                        <div className="rounded-[12px] bg-gold/8 px-3 py-2 text-[12.5px] text-ink">
                          <b className="font-medium">{o.rating} de 5</b>
                          {o.comment === null ? null : <span className="text-ink-soft"> · «{o.comment}»</span>}
                          {o.allowPublish ? <span className="block text-[11.5px] text-ink-mute">Deja publicar su opinión en la web</span> : null}
                          {o.allowPublish && o.comment !== null && !isErr(laWeb) && opinionPublicada(laWeb.value, o.comment) ? (
                            <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-sage-deep">
                              <CheckIcon className="size-3.5" /> Publicada en la web
                            </span>
                          ) : o.allowPublish && o.comment !== null && e.id !== null ? (
                            <div className="mt-2">
                              <PublicarOpinion autor={c.nombre.trim().split(/\s+/)[0] ?? c.nombre} eventId={e.id} rol={nombreDeFiesta(fiestaDeTema(eventoPorSlug.get(e.slug)?.themeKey ?? ''))} />
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
                            Darle su código de recomendación
                          </button>
                        </form>
                      )
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
                        <span className="text-ink-soft">
                          Código <b className="font-codigo font-medium tracking-[0.12em] text-ink">{codigo}</b>
                        </span>
                        <span className="text-ink-mute">{plural(usos.get(codigo) ?? 0, 'compra con su código', 'compras con su código')}</span>
                        <span className="w-full truncate font-codigo text-[11px] text-ink-mute">{`${sitio}/es?ref=${codigo}#precios`}</span>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </Bloque>
        )}

        <Bloque titulo="Recorrido">
          <ol className="relative flex flex-col gap-3.5 pl-5 before:absolute before:top-1.5 before:bottom-1.5 before:left-[5px] before:w-px before:bg-line-panel-strong">
            {lineaDeTiempo(c).map((h, i) => (
              <li className="relative" key={`${h.texto}-${i}`}>
                <span aria-hidden className="absolute top-1.5 -left-5 size-[11px] rounded-full border-2 border-bg-raised bg-ink-mute/60" />
                {h.href === null ? <p className="text-[13.5px] text-ink">{h.texto}</p> : (
                  <Link className="text-[13.5px] text-ink hover:underline" href={h.href}>
                    {h.texto}
                  </Link>
                )}
                <p className="font-mono text-[10.5px] tracking-[0.08em] text-ink-mute">{fechaLarga(h.cuando)}</p>
              </li>
            ))}
          </ol>
        </Bloque>
      </div>
    </PanelLateral>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 font-mono text-[10px] tracking-[0.18em] text-ink-mute uppercase">{titulo}</h3>
      {children}
    </section>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[11px] font-medium tracking-[0.1em] text-ink-mute uppercase">{etiqueta}</dt>
      <dd className="text-[14px] break-words text-ink">{children}</dd>
    </div>
  )
}
