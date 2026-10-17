import Link from 'next/link'
import { admin, cargarVentas, orders, plans } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { etapaDeVenta, filtrarVentas, siguientePaso, ventaDeClave, type EtapaDeVenta, type FiestaDeVenta, type Venta } from '@/modules/admin/domain/ventas'
import { rellenar, type Mensajes } from '@/modules/admin/domain/mensajes'
import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { Cotizador } from '@/modules/admin/ui/ventas/Cotizador'
import { FichaDeVenta } from '@/modules/admin/ui/ventas/FichaDeVenta'
import { fiestaDeTema } from '@/modules/events'
import { themeDefinitions, themeFor } from '@/modules/events/ui/themes/registry'
import { montoAPagar } from '@/modules/orders/domain/order'
import { NOMBRE_DE_EFECTO } from '@/modules/plans'
import { BRAND } from '@/shared/config/brand'
import { env } from '@/shared/config/env'
import { seAsigna } from '@/shared/design/theme-catalog'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { PanelAlert, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { PanelLateral } from '@/shared/design/ui/panel/PanelLateral'
import { PlusIcon, SearchIcon, ArrowLeftIcon } from '@/shared/design/ui/icons'
import { AccionDeLaIsla } from '@/shared/design/ui/panel/AccionDeLaIsla'
import { SelectorDeFiltro } from '@/shared/design/ui/panel/SelectorDeFiltro'
import { diaDelEvento, hace } from '@/shared/format/fecha'
import { formatAmount } from '@/shared/money'
import { plural } from '@/shared/format/plural'
import { isErr } from '@/shared/result'
import { enlaceWhatsapp } from '@/shared/whatsapp'
import { registrarFallo } from '@/shared/observability/fallos'
import { traducir } from '@/shared/i18n/en-ingles'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Ventas · Administración', 'Sales · Administration') }
}
export const dynamic = 'force-dynamic'

const BASE = '/panel/admin/ventas'
/** Filas de la lista antes de «Ver más». */
const PAGINA = 30
const FIESTAS: readonly { key: string; una: string; fiesta: FiestaDeVenta }[] = [
  { key: 'boda', una: 'Boda', fiesta: 'boda' },
  { key: 'xv', una: 'XV años', fiesta: 'xv' },
  { key: 'cumple', una: 'Cumpleaños', fiesta: 'cumple' },
]

/** Las pestañas de la maqueta (E02): cada una junta las etapas que se trabajan igual. */
const PESTANAS: readonly { clave: string; etiqueta: string; etapas: readonly EtapaDeVenta[] | null; alerta?: boolean }[] = [
  { clave: 'todas', etiqueta: 'Todas', etapas: null },
  { clave: 'consultas', etiqueta: 'Consultas', etapas: ['nueva', 'contactada'] },
  { clave: 'esperando-pago', etiqueta: 'Esperando pago', etapas: ['esperando_pago'] },
  { clave: 'por-revisar', etiqueta: 'Por revisar', etapas: ['por_revisar'], alerta: true },
  { clave: 'ganadas', etiqueta: 'Ganadas', etapas: ['por_crear_evento', 'saldo_pendiente', 'cerrada'] },
  { clave: 'perdidas', etiqueta: 'Perdidas', etapas: ['perdida', 'cancelada'] },
]

type Params = { [K in 'etapa' | 'q' | 'n' | 'venta' | 'pedido' | 'consulta' | 'crear' | 'cotizar']?: string | undefined }

/**
 * **Ventas, como en la maqueta «Esmeralda y Latón»** (E02 · T02 · M03 · M04, 12 de octubre): consultas, pedidos y
 * pagos en una sola lista, cada venta una vez —de la primera pregunta al evento creado (`componerVentas`)—. Arriba, el
 * buscador; debajo, las pestañas por etapa; a la izquierda la lista, y a la derecha la ficha de la venta elegida
 * (`?venta=`, o la primera) con sus pasos, su comprobante y su siguiente paso. En el celular, la lista y, al tocar una
 * venta, su ficha sola.
 *
 * Todo filtro vive en la dirección: se enlaza, sobrevive a recargar y a la acción que remonta.
 */
export default async function VentasPage({ searchParams }: { searchParams: Promise<Params> }) {
  const t = await tr()
  await requireAdmin()
  const p = await searchParams
  const ahora = new Date()
  const hoy = fechaEnBolivia(ahora)

  const [cargadas, cobro, plantillas] = await Promise.all([cargarVentas(ahora), admin.payment(), admin.mensajes()])
  if (isErr(cargadas)) {
    registrarFallo('panel/admin/ventas/page', 'VentasPage', cargadas.error)
    return (
      <>
        <h1 className="font-display text-[40px] font-medium">{t('Ventas', 'Sales')}</h1>
        <PanelCard className="mt-6">
          <p className="text-[14px] text-danger" role="alert">
            {t('No pudimos leer las ventas. La base no responde; vuelve a intentarlo en un momento.', 'We could not read the sales. The database is not responding; try again in a moment.')}
          </p>
        </PanelCard>
      </>
    )
  }

  const { ventas } = cargadas.value
  const q = p.q ?? ''
  const pestana = PESTANAS.find((x) => x.clave === p.etapa) ?? PESTANAS[0]!
  const buscadas = filtrarVentas(ventas, { etapa: 'todas', fiesta: 'todas', q })
  const dePestana = (x: (typeof PESTANAS)[number]) => buscadas.filter((v) => (x.etapas === null ? v.etapa !== 'perdida' && v.etapa !== 'cancelada' : x.etapas.includes(v.etapa)))
  const visibles = dePestana(pestana)
  const tope = Number(p.n) > 0 ? Number(p.n) : PAGINA

  const enlace = (cambio: Partial<Params>) => {
    const actual: Params = { etapa: pestana.clave === 'todas' ? undefined : pestana.clave, q: q === '' ? undefined : q, ...cambio }
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(actual)) if (v !== undefined && v !== '') params.set(k, v)
    const cadena = params.toString()
    return cadena === '' ? BASE : `${BASE}?${cadena}`
  }
  const cerrar = enlace({})
  const cobroListo = !isErr(cobro) && cobro.value.bank !== '' && cobro.value.accountHolder !== '' && cobro.value.accountNumber !== ''

  const pedida = ventaDeClave(ventas, { venta: p.venta, pedido: p.pedido, consulta: p.consulta })
  // En la computadora siempre hay una ficha abierta: la pedida o la primera de la lista. En el celular, solo la pedida.
  const abierta = pedida ?? visibles[0]
  const cotizando = p.crear === 'cotizacion' || (pedida !== undefined && p.cotizar === '1')

  return (
    <div className="flex flex-col gap-6">
      <div className={`flex flex-wrap items-end justify-between gap-5 ${pedida === undefined ? '' : 'max-[767px]:hidden'}`}>
        <div className="min-w-0">
          <h1 className="font-display text-[34px] leading-[1.08] font-medium min-[560px]:text-[42px]">{t('Ventas', 'Sales')}</h1>
          <p className="mt-2.5 max-w-[560px] text-[16px] text-ink-mute max-[767px]:hidden">{t('Consultas, pedidos y pagos en una sola lista. Cada venta dice qué toca ahora.', 'Inquiries, orders and payments in a single list. Each sale says what to do next.')}</p>
        </div>
        <form action={BASE} className="relative w-[280px] max-[559px]:w-full" method="get" role="search">
          {pestana.clave === 'todas' ? null : <input name="etapa" type="hidden" value={pestana.clave} />}
          <label className="sr-only" htmlFor="buscar-venta">
            {t('Buscar venta', 'Search sale')}
          </label>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ink-mute" />
          <input
            className="h-[46px] w-full rounded-[8px] border border-line-panel-strong bg-bg-raised pr-3.5 pl-10.5 text-[15px] outline-none focus:border-gold focus:shadow-[0_0_0_3px_rgb(var(--color-gold-rgb)/0.22)]"
            defaultValue={q}
            id="buscar-venta"
            name="q"
            placeholder={t('Cliente o referencia', 'Client or reference')}
            type="search"
          />
        </form>
      </div>

      {cobroListo ? null : (
        <div className={pedida === undefined ? '' : 'max-[767px]:hidden'}>
        <PanelAlert tone="error">
          {t('Faltan tus datos de cobro: quien recibe una cotización no ve a dónde pagar.', 'Your payment details are missing: whoever receives a quote won’t see where to pay.')}{' '}
          <Link className="inline-flex min-h-11 items-center font-medium underline underline-offset-4 align-middle" href="/panel/admin/pagos">
            {t('Cargarlos', 'Add them')}
          </Link>
        </PanelAlert>
        </div>
      )}

      {/* En el celular, las etapas en un selector (maqueta M03): cinco pestañas no caben. */}
      {pedida === undefined ? (
        <div className="min-[768px]:hidden">
          <SelectorDeFiltro
            actual={pestana.clave}
            etiqueta={t('Mostrar', 'Show')}
            opciones={PESTANAS.filter((x) => x.clave !== 'perdidas' || dePestana(x).length > 0).map((x) => ({
              key: x.clave,
              label: x.clave === 'todas' ? t('Todas las etapas', 'All stages') : traducir(x.etiqueta, t),
              count: dePestana(x).length,
              href: enlace({ etapa: x.clave === 'todas' ? undefined : x.clave, n: undefined, venta: undefined }),
            }))}
          />
        </div>
      ) : null}
      <AccionDeLaIsla>
        <Link aria-label={t('Nueva cotización', 'New quote')} className="flex min-h-11 items-center gap-1 rounded-full border border-line-panel-strong bg-bg-raised px-3.5 text-[14px] font-medium text-ink no-underline" href={`${BASE}?crear=cotizacion`}>
          <PlusIcon className="size-4.5" />
          {t('Nueva', 'New')}
        </Link>
      </AccionDeLaIsla>

      <nav aria-label={t('Etapas', 'Stages')} className="-mt-1 overflow-x-auto border-b border-line-panel [scrollbar-width:none] max-[767px]:hidden">
        <ul className="flex min-w-max gap-7 max-[559px]:gap-5">
          {PESTANAS.filter((x) => x.clave !== 'perdidas' || dePestana(x).length > 0 || pestana.clave === 'perdidas').map((x) => {
            const n = dePestana(x).length
            const activa = x === pestana
            return (
              <li key={x.clave}>
                <Link
                  aria-current={activa ? 'true' : undefined}
                  className={`-mb-px flex h-[46px] items-center gap-2 border-b-[1.5px] px-0.5 text-[15px] font-medium whitespace-nowrap no-underline ${activa ? 'border-gold text-shell-deep' : 'border-transparent text-ink-mute hover:text-shell-deep'}`}
                  href={enlace({ etapa: x.clave === 'todas' ? undefined : x.clave, n: undefined, venta: undefined })}
                >
                  {traducir(x.etiqueta, t)}
                  {x.alerta && n > 0 ? <Pill tone="pending">{n}</Pill> : <span className="text-[12px] font-normal text-ink-mute">{n}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {ventas.length === 0 ? (
        <PanelCard>
          <EmptyState
            action={
              <PanelButton href={`${BASE}?crear=cotizacion`} variant="primary">
                {t('Crear una cotización', 'Create a quote')}
              </PanelButton>
            }
            description={t('Aquí llega quien escribe desde la web o pide un plan, y lo que tú cotizas. Cada persona es una sola venta, de la consulta a su evento.', 'Here arrive those who write from the website or order a plan, and what you quote. Each person is a single sale, from inquiry to event.')}
            title={t('Todavía no hay ventas', 'No sales yet')}
          />
        </PanelCard>
      ) : (
        <div className="flex flex-wrap items-start gap-8">
          <section aria-label={t('Lista de ventas', 'Sales list')} className={`min-w-0 flex-[999_1_460px] border-t border-line-panel ${pedida === undefined ? '' : 'max-[767px]:hidden'}`}>
            {visibles.length === 0 ? (
              <p className="py-8 text-center text-[15px] text-ink-mute">{q === '' ? t('Ninguna venta en esta etapa.', 'No sales at this stage.') : t(`Ninguna venta con «${q}».`, `No sales matching “${q}”.`)}</p>
            ) : (
              <>
                <ul>
                  {visibles.slice(0, tope).map((v) => (
                    <li key={v.clave}>
                      <FilaDeVenta abierta={abierta?.clave === v.clave} ahora={ahora} href={enlace({ venta: v.clave })} venta={v} />
                    </li>
                  ))}
                </ul>
                {visibles.length > tope ? (
                  <div className="mt-4">
                    <PanelButton href={enlace({ n: String(tope + PAGINA) })}>{t('Ver', 'See')} {plural(Math.min(PAGINA, visibles.length - tope), t('venta más', 'more sale'), t('ventas más', 'more sales'))}</PanelButton>
                  </div>
                ) : null}
              </>
            )}
          </section>
          {abierta === undefined || cotizando ? null : (
            <div className={`flex min-w-0 flex-[1_1_400px] ${pedida === undefined ? 'max-[767px]:hidden' : ''}`} data-sin-isla={pedida === undefined ? undefined : ''}>
              <Ficha ahora={ahora} cerrar={cerrar} cotizarHref={enlace({ venta: abierta.clave, cotizar: '1' })} plantillas={isErr(plantillas) ? null : plantillas.value.mensajes} venta={abierta} />
            </div>
          )}
        </div>
      )}

      {cotizando ? <Cotizacion cerrar={pedida === undefined ? cerrar : enlace({ venta: pedida.clave })} cobroListo={cobroListo} hoy={hoy} venta={pedida} /> : null}
    </div>
  )
}

/** Una venta de la lista (maqueta E02 `.v`): nombre y etapa, de qué se trata, y lo que vale y cuánto espera. */
async function FilaDeVenta({ venta: v, href, abierta, ahora }: { venta: Venta; href: string; abierta: boolean; ahora: Date }) {
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  const e = etapaDeVenta(v.etapa)
  const una = v.fiesta === null ? undefined : FIESTAS.find((f) => f.fiesta === v.fiesta)?.una
  const info = [una === undefined ? null : traducir(una, t), v.fechaEvento === null ? null : diaDelEvento(v.fechaEvento, locale), v.pedido?.producto ?? (v.consulta?.categoria ? traducir(v.consulta.categoria, t) : null)]
    .filter(Boolean)
    .join(', ')
  const importe = v.importeCents === null ? '—' : formatAmount(v.importeCents, 'BOB').replace(/,00$/, '')
  const paso = siguientePaso(v)
  return (
    <Link
      aria-current={abierta ? 'true' : undefined}
      className={`flex items-center gap-4.5 border-b border-line-panel px-5 py-4.5 text-ink no-underline transition-colors hover:bg-fila max-[767px]:flex-col max-[767px]:items-stretch max-[767px]:gap-1.5 max-[767px]:px-0 ${abierta ? 'min-[768px]:bg-bg-raised min-[768px]:shadow-[inset_3px_0_0_var(--color-gold)]' : ''}`}
      href={href}
      scroll={false}
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2.5 max-[767px]:flex-nowrap max-[767px]:justify-between">
          <span className="font-display text-[20px] leading-tight font-medium max-[767px]:text-[22px]">{v.nombre}</span>
          <span className="max-[767px]:hidden">
            <Pill tone={e.tono}>{traducir(e.una, t)}</Pill>
          </span>
          <span className="font-display text-[20px] font-medium min-[768px]:hidden">{importe}</span>
        </span>
        <span className="mt-0.5 block text-[14px] text-ink-mute">
          {info || v.correo || v.telefono || t('Sin detalles', 'No details')}
          <span className="min-[768px]:hidden">, {hace(v.esperaDesde, ahora, locale)}</span>
        </span>
      </span>
      {/* En el celular, la etapa y lo que toca, debajo (maqueta M03). */}
      <span className="flex items-center justify-between gap-3 min-[768px]:hidden">
        <Pill tone={e.tono}>{traducir(e.una, t)}</Pill>
        {paso === null ? null : <span className="text-[14.5px] font-medium text-gold-deep">{traducir(paso, t)}</span>}
      </span>
      <span className="shrink-0 text-right max-[767px]:hidden">
        <span className="block font-display text-[19px] font-medium">{importe}</span>
        <span className={`text-[12.5px] ${v.urgente ? 'text-danger' : 'text-ink-mute'}`}>{hace(v.esperaDesde, ahora, locale)}</span>
      </span>
    </Link>
  )
}

/** La ficha de la venta abierta, con sus enlaces armados y el mensaje de la plantilla dentro. */
async function Ficha({
  venta: v,
  cerrar,
  cotizarHref,
  plantillas,
  ahora,
}: {
  venta: Venta
  cerrar: string
  cotizarHref: string
  plantillas: Mensajes | null
  ahora: Date
}) {
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  const leido = v.pedido === null ? null : await orders.byRef(v.pedido.publicRef)
  const pedido = leido === null || isErr(leido) ? null : leido.value.order
  const comprobantes = leido === null || isErr(leido) ? [] : leido.value.proofs
  const nombre = v.nombre.split(' ')[0] ?? v.nombre
  const enlacePedido = v.pedido === null ? null : `${env.SITE_URL.replace(/\/$/, '')}/es/pedido/ref/${v.pedido.publicRef}`
  const aPagar = pedido === null ? null : montoAPagar(pedido)
  const fecha = v.fechaEvento === null ? null : diaDelEvento(v.fechaEvento)
  const fechaVista = v.fechaEvento === null ? null : diaDelEvento(v.fechaEvento, locale)
  const vars = { nombre, fecha, enlace: enlacePedido, importe: aPagar === null ? null : formatAmount(aPagar, 'BOB'), plan: pedido?.planName ?? null, marca: BRAND.siteName }
  const saludo = v.etapa === 'nueva' && plantillas !== null ? rellenar(plantillas.contacto, vars) : `Hola ${nombre}, te escribimos de ${BRAND.siteName}.`
  const contacto = v.telefono ?? (v.pedido !== null && !v.pedido.contact.includes('@') ? v.pedido.contact : null)

  return (
    // La ficha de la maqueta (E02): al lado de la lista, en su tarjeta de marfil. En el celular, sola (M04).
    <section aria-labelledby="ficha-de-venta" className="flex min-w-0 flex-[1_1_400px] flex-col gap-5.5 rounded-[16px] border border-line-panel bg-bg-raised p-7.5 max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:bg-transparent max-[767px]:p-0">
      <Link className="mb-1 flex min-h-15 items-center gap-2 rounded-[18px] border border-line-panel bg-bg-raised px-1.5 text-ink no-underline shadow-[0_8px_24px_-14px_rgb(12_36_32/0.28)] min-[768px]:hidden" href={cerrar}>
        <span aria-hidden className="grid size-11 shrink-0 place-items-center">
          <ArrowLeftIcon className="size-5" />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[13px] text-ink-mute">{t('Ventas', 'Sales')}</span>
          <span className="truncate text-[16px] font-medium">{v.nombre}</span>
        </span>
        <span className="sr-only">{t(': volver', ': back')}</span>
      </Link>
      <div>
        <p className="mb-1.5 text-[13.5px] text-ink-mute">{v.pedido === null ? t('Consulta desde la web', 'Inquiry from the website') : t(`Pedido ${v.pedido.publicRef}`, `Order ${v.pedido.publicRef}`)}</p>
        <h2 className="font-display text-[32px] leading-[1.1] font-medium" id="ficha-de-venta">
          {v.nombre}
        </h2>
        <p className="mt-1.5 text-[15px] text-ink-mute">
          {[v.fiesta === null ? null : traducir(FIESTAS.find((f) => f.fiesta === v.fiesta)?.una ?? '', t) || null, fechaVista === null ? null : t(`el ${fechaVista}`, `on ${fechaVista}`), v.pedido?.producto ?? null, v.importeCents === null ? null : formatAmount(v.importeCents, 'BOB')]
            .filter(Boolean)
            .join(', ')}
        </p>
      </div>
      <PasosDeLaVenta venta={v} />
      <FichaDeVenta
        ahora={ahora}
        comprobantes={comprobantes}
        diseno={pedido?.templateSlug == null ? null : themeFor(pedido.templateSlug).key === pedido.templateSlug ? themeFor(pedido.templateSlug).label : t('Un diseño retirado', 'A withdrawn design')}
        enlaces={{
          contactar: enlaceWhatsapp(contacto, saludo),
          correo: v.correo === null ? null : `mailto:${v.correo}?subject=${encodeURIComponent(`${BRAND.siteName} · tu evento`)}&body=${encodeURIComponent(saludo)}`,
          recordar: plantillas === null ? null : enlaceWhatsapp(contacto, rellenar(plantillas.recordatorio, vars)),
          pedido: enlacePedido,
          cliente: `/panel/admin/clientes?de=${encodeURIComponent(v.correo ?? v.telefono ?? v.nombre)}`,
          crearEvento:
            v.pedido !== null
              ? `/panel/admin/eventos?crear=evento&pedido=${v.pedido.publicRef}`
              : v.consulta !== null && (v.etapa === 'nueva' || v.etapa === 'contactada')
                ? `/panel/admin/eventos?crear=evento&consulta=${v.consulta.id}`
                : null,
          cotizar: cotizarHref,
        }}
        venta={v}
      />
    </section>
  )
}

/** Los cuatro pasos de una venta (maqueta E02): consulta, pedido, comprobante y evento; el actual, en latón. */
async function PasosDeLaVenta({ venta: v }: { venta: Venta }) {
  const t = await tr()
  const indice: Record<EtapaDeVenta, number> = { nueva: 0, contactada: 0, esperando_pago: 1, por_revisar: 2, por_crear_evento: 3, saldo_pendiente: 4, cerrada: 4, perdida: -1, cancelada: -1 }
  const actual = indice[v.etapa]
  if (actual < 0) return null
  return (
    <ol aria-label={t('Pasos de la venta', 'Sale steps')} className="grid grid-cols-4 gap-2 text-[13.5px]">
      {[t('Consulta', 'Inquiry'), t('Pedido', 'Order'), t('Comprobante', 'Receipt'), t('Evento', 'Event')].map((paso, i) => (
        <li aria-current={i === actual ? 'step' : undefined} className={`flex flex-col gap-2 ${i === actual ? 'font-semibold text-shell-deep' : i > actual ? 'text-ink-mute' : ''}`} key={paso}>
          <span aria-hidden className={`h-[3px] ${i < actual ? 'bg-shell-deep' : i === actual ? 'bg-gold' : 'bg-line-panel'}`} />
          {paso}
        </li>
      ))}
    </ol>
  )
}

/** El cotizador en su panel: desde una consulta (con sus datos puestos) o desde «+ Crear». */
async function Cotizacion({ venta, cerrar, hoy, cobroListo }: { venta: Venta | undefined; cerrar: string; hoy: string; cobroListo: boolean }) {
  const t = await tr()
  const [planesAdmin, extras, eventos, agenda] = await Promise.all([admin.plans(), plans.listActiveExtras(), admin.events(), admin.mensajes()])
  const ocupacion: Record<string, number> = {}
  if (!isErr(eventos)) for (const e of eventos.value) if (e.eventDate >= hoy) ocupacion[e.eventDate] = (ocupacion[e.eventDate] ?? 0) + 1
  const c = venta?.consulta ?? null
  const modelos = themeDefinitions()
    .filter((tema) => seAsigna(tema.key))
    .map((tema) => ({ key: tema.key, label: tema.label, fiesta: fiestaDeTema(tema.key) }))
  return (
    <PanelLateral closeHref={cerrar} subtitle={c === null ? t('Plan, diseño, extras y precio, con su enlace de pago', 'Plan, design, extras and price, with its payment link') : t(`Para ${c.name}`, `For ${c.name}`)} title={t('Nueva cotización', 'New quote')}>
      <Cotizador
        capacidad={isErr(agenda) ? 3 : agenda.value.capacidad}
        cerrarHref={cerrar}
        cobroListo={cobroListo}
        consulta={c === null ? null : { id: c.id, nombre: c.name, contacto: c.phone ?? c.email ?? '', fecha: c.eventDate, fiesta: c.fiesta }}
        extras={extras.map((x) => ({ slug: x.slug, name: x.name, priceCents: x.priceCents, que: NOMBRE_DE_EFECTO[x.effect] }))}
        hoy={hoy}
        modelos={modelos}
        ocupacion={ocupacion}
        planes={isErr(planesAdmin) ? [] : planesAdmin.value.filter((pl) => pl.isActive).map((pl) => ({ slug: pl.slug, nombre: pl.es?.name ?? pl.slug, priceCents: pl.priceCents, depositPct: pl.depositPct, depositFixedCents: pl.depositFixedCents }))}
      />
    </PanelLateral>
  )
}
