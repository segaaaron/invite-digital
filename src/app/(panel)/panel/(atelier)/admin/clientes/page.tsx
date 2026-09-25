import Link from 'next/link'
import { admin, events, leads, orders } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { agruparClientes, filtrarClientes, type Cliente } from '@/modules/admin'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { EmptyState, LoadMoreLink } from '@/shared/design/ui/panel/estados'
import { PanelButton, Pill, SearchField } from '@/shared/design/ui/panel/PanelKit'
import { DatoLateral, PanelLateral } from '@/shared/design/ui/panel/PanelLateral'
import { BRAND } from '@/shared/config/brand'
import { isErr } from '@/shared/result'
import { enlaceWhatsapp } from '@/shared/whatsapp'

export const metadata = { title: 'Clientes · Administración' }
export const dynamic = 'force-dynamic'

const BASE = '/panel/admin/clientes'
const PAGINA = 30
const CORTA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/La_Paz' })
const DIA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

const ESTADO_CONSULTA: Record<string, string> = { new: 'Nueva', contacted: 'Contactada', won: 'Ganada', lost: 'Perdida' }
const ESTADO_PEDIDO: Record<string, string> = { pending_payment: 'Esperando pago', proof_submitted: 'Por revisar', approved: 'Aprobado', rejected: 'Rechazado' }

/**
 * **Clientes: la ficha 360 de cada persona** (el «contacto» de HoneyBook o Dubsado). Una misma
 * novia escribía una consulta, pedía el plan y recibía su cuenta, y cada cosa vivía en una
 * pantalla distinta. Aquí se juntan por correo o teléfono (`agruparClientes`), con sus
 * consultas, pedidos y eventos, y el panel lateral lleva a cada uno.
 *
 * Incluye a quien solo escribió una consulta: un prospecto también es un cliente por ganar.
 */
export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string; cliente?: string; n?: string }> }) {
  await requireAdmin()
  const { q = '', cliente: abierto, n } = await searchParams

  const [consultas, pedidos, usuarios, eventos] = await Promise.all([
    leads.list(null),
    orders.page({ status: null, tope: 2000, prioridad: ['approved'] }),
    admin.users(),
    admin.events(),
  ])
  if (isErr(consultas) || isErr(pedidos) || isErr(usuarios) || isErr(eventos)) {
    return (
      <>
        <PanelHeader kicker="Administración" title="Clientes" />
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los clientes. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      </>
    )
  }
  const anfitriones = await events.staff.hostsOf(eventos.value.map((e) => e.id))

  const todos = agruparClientes({
    consultas: consultas.value.filas,
    pedidos: pedidos.value.pedidos.map(({ order: o }) => ({
      publicRef: o.publicRef,
      customerName: o.customerName,
      contact: o.contact,
      status: o.status,
      createdAt: o.createdAt,
      eventSlug: o.eventSlug,
      producto: o.addonSlug === null ? (o.planName ?? 'Plan retirado') : `Extra · ${o.addonName ?? o.addonSlug}`,
    })),
    cuentas: usuarios.value.filter((u) => u.role === 'cliente').map((u) => ({ email: u.email, phone: null, createdAt: u.createdAt })),
    eventos: eventos.value.map((e) => ({ slug: e.slug, title: e.title, eventDate: e.eventDate, anfitriones: anfitriones.get(e.id) ?? [] })),
  })
  const encontrados = filtrarClientes(todos, q)
  const pedidoTope = Number(n)
  const tope = Number.isInteger(pedidoTope) && pedidoTope > 0 ? Math.min(pedidoTope, 1000) : PAGINA
  const visibles = encontrados.slice(0, tope)
  const conCuenta = todos.filter((c) => c.cuenta).length

  const enlace = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q === '' ? {} : { q }), ...(n === undefined ? {} : { n }), ...extra })
    const cadena = p.toString()
    return cadena === '' ? BASE : `${BASE}?${cadena}`
  }
  const ficha = abierto === undefined ? undefined : todos.find((c) => c.clave === abierto)

  return (
    <>
      <PanelHeader
        kicker="Administración"
        meta={todos.length === 0 ? 'Quien escribe, compra o tiene cuenta' : `${todos.length} personas · ${conCuenta} con cuenta`}
        title="Clientes"
      />

      <PanelCard>
        <form action={BASE} className="mb-4 flex flex-wrap gap-2" role="search">
          <SearchField defaultValue={q} label="Buscar clientes" name="q" placeholder="Nombre, correo o teléfono" />
          <PanelButton type="submit">Buscar</PanelButton>
          {q === '' ? null : <PanelButton href={BASE}>Limpiar</PanelButton>}
        </form>

        {visibles.length === 0 ? (
          <EmptyState
            description={q === '' ? 'Aparecen en cuanto alguien escribe desde la web, pide un plan o recibe su cuenta.' : 'Prueba con otra parte del nombre, el correo o los últimos dígitos del teléfono.'}
            title={q === '' ? 'Todavía no hay clientes' : `Nadie coincide con «${q}»`}
          />
        ) : (
          <ul className="-mx-2 flex flex-col">
            {visibles.map((c) => (
              <li key={c.clave}>
                <Link
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-[12px] px-2 py-3 transition-colors hover:bg-bg-sunken focus-visible:outline-2 focus-visible:outline-ink min-[760px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto]"
                  href={enlace({ cliente: c.clave })}
                  scroll={false}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-display text-[17px] leading-tight text-ink">{c.nombre}</span>
                    <span className="block truncate text-[12px] text-ink-mute">{[...c.correos, ...c.telefonos].join(' · ') || 'Sin contacto'}</span>
                  </span>
                  <span className="text-[12px] text-ink-soft max-[759px]:col-span-2 max-[759px]:row-start-2">
                    {resumen(c)}
                  </span>
                  <span className="max-[759px]:col-start-2 max-[759px]:row-start-1">{c.cuenta ? <Pill tone="ok">Con cuenta</Pill> : c.pedidos.length > 0 ? <Pill tone="maybe">Comprador</Pill> : <Pill tone="pending">Prospecto</Pill>}</span>
                  <span className="text-right text-[11.5px] whitespace-nowrap text-ink-mute max-[759px]:hidden">{CORTA.format(c.ultima)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {encontrados.length > visibles.length ? <LoadMoreLink href={enlace({ n: String(tope + PAGINA) })} noun="clientes" remaining={encontrados.length - visibles.length} /> : null}
      </PanelCard>

      {ficha === undefined ? null : <FichaDeCliente cliente={ficha} closeHref={enlace({})} />}
    </>
  )
}

function resumen(c: Cliente): string {
  const partes = [
    c.consultas.length === 0 ? null : `${c.consultas.length} consulta${c.consultas.length === 1 ? '' : 's'}`,
    c.pedidos.length === 0 ? null : `${c.pedidos.length} pedido${c.pedidos.length === 1 ? '' : 's'}`,
    c.eventos.length === 0 ? null : `${c.eventos.length} evento${c.eventos.length === 1 ? '' : 's'}`,
  ].filter((x) => x !== null)
  return partes.length === 0 ? 'Solo la cuenta' : partes.join(' · ')
}

function FichaDeCliente({ cliente: c, closeHref }: { cliente: Cliente; closeHref: string }) {
  const telefono = c.telefonos[0]
  const whatsapp = telefono === undefined ? null : enlaceWhatsapp(telefono.replace(/[^\d+]/g, ''), `Hola ${c.nombre}, te escribimos de ${BRAND.siteName}.`)
  const correo = c.correos[0]
  return (
    <PanelLateral
      acciones={
        whatsapp === null && correo === undefined ? undefined : (
          <>
            {whatsapp === null ? null : (
              <PanelButton external href={whatsapp}>
                Escribir por WhatsApp
              </PanelButton>
            )}
            {correo === undefined ? null : <PanelButton href={`mailto:${correo}`}>Enviar correo</PanelButton>}
          </>
        )
      }
      closeHref={closeHref}
      subtitle={`Última actividad: ${CORTA.format(c.ultima)}`}
      title={c.nombre}
    >
      <dl className="mb-6 grid gap-4 min-[480px]:grid-cols-2">
        <DatoLateral label="Correo">{c.correos.join(', ') || '—'}</DatoLateral>
        <DatoLateral label="Teléfono">{c.telefonos.join(', ') || '—'}</DatoLateral>
        <DatoLateral label="Cuenta en el panel">{c.cuenta ? 'Sí, entra con su correo' : 'No tiene'}</DatoLateral>
      </dl>

      <Bloque titulo="Eventos" vacio="Ningún evento todavía.">
        {c.eventos.map((e) => (
          <Fila href={`/panel/eventos/${e.slug}/configuracion`} key={e.slug} titulo={e.title} detalle={DIA.format(new Date(`${e.eventDate}T00:00:00Z`))} />
        ))}
      </Bloque>
      <Bloque titulo="Pedidos" vacio="No ha pedido ningún plan.">
        {c.pedidos.map((p) => (
          <Fila estado={ESTADO_PEDIDO[p.status] ?? p.status} href={`/panel/admin/ventas?pedido=${p.publicRef}`} key={p.publicRef} titulo={p.producto} detalle={`${p.publicRef} · ${CORTA.format(p.createdAt)}`} />
        ))}
      </Bloque>
      <Bloque titulo="Consultas" vacio="No escribió desde la web.">
        {c.consultas.map((k) => (
          <Fila estado={ESTADO_CONSULTA[k.status] ?? k.status} href={`/panel/admin/ventas?consulta=${k.id}`} key={k.id} titulo={k.name} detalle={CORTA.format(k.createdAt)} />
        ))}
      </Bloque>
    </PanelLateral>
  )
}

function Bloque({ titulo, vacio, children }: { titulo: string; vacio: string; children: React.ReactNode[] }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 text-[11px] font-medium tracking-[0.1em] text-ink-mute uppercase">
        {titulo} · {children.length}
      </h3>
      {children.length === 0 ? <p className="text-[13px] text-ink-mute">{vacio}</p> : <ul className="flex flex-col gap-2">{children}</ul>}
    </section>
  )
}

function Fila({ href, titulo, detalle, estado }: { href: string; titulo: string; detalle: string; estado?: string }) {
  return (
    <li>
      <Link className="flex items-center justify-between gap-3 rounded-[12px] border border-line-panel bg-white px-3.5 py-2.5 transition-colors hover:border-ink/50" href={href}>
        <span className="min-w-0">
          <span className="block truncate text-[14px] text-ink">{titulo}</span>
          <span className="block truncate text-[12px] text-ink-mute">{detalle}</span>
        </span>
        {estado === undefined ? <span aria-hidden className="text-ink-mute">→</span> : <span className="shrink-0 text-[12px] text-ink-soft">{estado}</span>}
      </Link>
    </li>
  )
}
