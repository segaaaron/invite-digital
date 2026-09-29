import Link from 'next/link'
import { admin, cargarVentas, orders, plans } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import {
  ETAPAS_DE_VENTA,
  contarPorEtapa,
  etapaDeVenta,
  filtrarVentas,
  primeraRespuestaMedia,
  ventaDeClave,
  type EtapaDeVenta,
  type FiestaDeVenta,
  type Venta,
} from '@/modules/admin/domain/ventas'
import { rellenar, type Mensajes } from '@/modules/admin/domain/mensajes'
import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { Cotizador } from '@/modules/admin/ui/ventas/Cotizador'
import { FichaDeVenta } from '@/modules/admin/ui/ventas/FichaDeVenta'
import { fiestaDeTema } from '@/modules/events'
import { themeDefinitions, themeFor } from '@/modules/events/ui/themes/registry'
import { montoAPagar } from '@/modules/orders/domain/order'
import { NOMBRE_DE_EFECTO } from '@/modules/plans'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { BRAND } from '@/shared/config/brand'
import { env } from '@/shared/config/env'
import { seAsigna } from '@/shared/design/theme-catalog'
import { BoardIcon, ListIcon } from '@/shared/design/ui/icons'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { BarraDeFiltros, ConmutadorDeVista, EncabezadoDeLista, FilaDeLista, TiraDeCifras, puntoDeFiesta } from '@/shared/design/ui/panel/lista'
import { PanelAlert, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { PanelLateral } from '@/shared/design/ui/panel/PanelLateral'
import { diaCorto, diaDelEvento, hace } from '@/shared/format/fecha'
import { formatAmount } from '@/shared/money'
import { plural } from '@/shared/format/plural'
import { isErr } from '@/shared/result'
import { enlaceWhatsapp } from '@/shared/whatsapp'
import { registrarFallo } from '@/shared/observability/fallos'

export const metadata = { title: 'Ventas · Administración' }
export const dynamic = 'force-dynamic'

const BASE = '/panel/admin/ventas'
/** Tarjetas por columna del tablero; el resto, en la lista con su filtro. */
const POR_COLUMNA = 12
/** Filas de la lista antes de «Ver más». */
const PAGINA = 30
const FIESTAS: readonly { key: string; label: string; fiesta: FiestaDeVenta }[] = [
  { key: 'todas', label: 'Todas', fiesta: null },
  { key: 'boda', label: 'Bodas', fiesta: 'boda' },
  { key: 'xv', label: 'XV años', fiesta: 'xv' },
  { key: 'cumple', label: 'Cumpleaños', fiesta: 'cumple' },
]
const COLUMNAS_DE_LISTA = 'min-[860px]:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_180px_100px_120px]'

type Params = { [K in 'vista' | 'etapa' | 'fiesta' | 'q' | 'n' | 'venta' | 'pedido' | 'consulta' | 'crear' | 'cotizar']?: string | undefined }

/**
 * **Ventas: cada venta una sola vez, de la primera pregunta a la boda creada.** Eran tres
 * pantallas —el tablero, la bandeja de Consultas y la de Pedidos— que enseñaban lo mismo de tres
 * formas, y una persona que preguntaba y luego pagaba era dos tarjetas. Ahora la consulta y su
 * pedido son una fila (`componerVentas`), vista como **tablero** o como **lista**, con **una**
 * ficha lateral (`?venta=`) que dice el siguiente paso.
 *
 * Todo filtro vive en la dirección: se enlaza, sobrevive a recargar y a la acción que remonta.
 */
export default async function VentasPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin()
  const p = await searchParams
  const ahora = new Date()
  const hoy = fechaEnBolivia(ahora)

  const [cargadas, cobro, plantillas] = await Promise.all([cargarVentas(ahora), admin.payment(), admin.mensajes()])
  if (isErr(cargadas)) {
    registrarFallo('panel/admin/ventas/page', 'VentasPage', cargadas.error)
    return (
      <>
        <PanelHeader kicker="Ventas" title="Embudo" />
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer las ventas. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      </>
    )
  }

  const { ventas, consultas } = cargadas.value
  const vista = p.vista === 'lista' ? 'lista' : 'tablero'
  const fiesta = FIESTAS.find((f) => f.key === p.fiesta)?.key ?? 'todas'
  const etapa: EtapaDeVenta | 'abiertas' | 'todas' =
    p.etapa === 'todas' ? 'todas' : (ETAPAS_DE_VENTA.find((e) => e.clave === p.etapa)?.clave ?? 'abiertas')
  const q = p.q ?? ''
  const fiestaFiltro = fiesta === 'todas' ? 'todas' : (fiesta as Exclude<FiestaDeVenta, null>)
  const visibles = filtrarVentas(ventas, { etapa: vista === 'tablero' ? 'todas' : etapa, fiesta: fiestaFiltro, q })
  const conteo = contarPorEtapa(filtrarVentas(ventas, { etapa: 'todas', fiesta: fiestaFiltro, q }))

  const enlace = (cambio: Partial<Params>) => {
    const actual: Params = { vista, etapa: etapa === 'abiertas' ? undefined : etapa, fiesta: fiesta === 'todas' ? undefined : fiesta, q: q === '' ? undefined : q, ...cambio }
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(actual)) if (v !== undefined && v !== '' && !(k === 'vista' && v === 'tablero')) params.set(k, v)
    const cadena = params.toString()
    return cadena === '' ? BASE : `${BASE}?${cadena}`
  }
  const cerrar = enlace({})

  // Las cifras: lo que pide acción, lo que está en juego, lo rápido que se contesta y cuánto se cierra.
  const bs = (cents: number) => formatAmount(cents, 'BOB')
  const porAtender = ventas.filter((v) => etapaDeVenta(v.etapa).accion).length
  const enJuego = ventas.filter((v) => v.etapa === 'esperando_pago' || v.etapa === 'por_revisar').reduce((s, v) => s + (v.importeCents ?? 0), 0)
  const hace90 = new Date(ahora.getTime() - 90 * 86_400_000)
  const respuesta = primeraRespuestaMedia(consultas.filter((c) => c.createdAt >= hace90))
  const decididas = conteo.cerrada + conteo.perdida + conteo.cancelada
  const cierre = decididas === 0 ? null : Math.round((conteo.cerrada / decididas) * 100)
  const cobroListo = !isErr(cobro) && cobro.value.bank !== '' && cobro.value.accountHolder !== '' && cobro.value.accountNumber !== ''

  const abierta = ventaDeClave(ventas, { venta: p.venta, pedido: p.pedido, consulta: p.consulta })
  const cotizando = p.crear === 'cotizacion' || (abierta !== undefined && p.cotizar === '1')

  return (
    <>
      <PanelHeader
        kicker="Ventas"
        meta={porAtender === 0 ? 'Nada espera por ti ahora mismo' : `${porAtender} ${porAtender === 1 ? 'venta espera' : 'ventas esperan'} por ti`}
        title="Embudo"
      />

      {cobroListo ? null : (
        <div className="mb-4">
          <PanelAlert tone="error">
            Faltan tus datos de cobro: quien recibe una cotización no ve a dónde pagar.{' '}
            <Link className="font-medium underline underline-offset-4" href="/panel/admin/pagos">
              Cargarlos
            </Link>
          </PanelAlert>
        </div>
      )}

      <TiraDeCifras
        cifras={[
          { label: 'Por atender', value: porAtender, detail: 'Nuevas, pagos y eventos por crear', tono: porAtender > 0 ? 'alerta' : 'normal' },
          { label: 'En juego', value: bs(enJuego), detail: `${conteo.esperando_pago + conteo.por_revisar} por cobrar` },
          { label: 'Primera respuesta', value: respuesta === null ? '—' : respuesta < 1 ? `${Math.round(respuesta * 60)} min` : `${respuesta} h`, detail: 'Media, últimos 90 días' },
          { label: 'Cierre', value: cierre === null ? '—' : `${cierre} %`, detail: 'De las ventas decididas' },
        ]}
      />

      <BarraDeFiltros
        actual={etapa}
        busqueda={{ accion: BASE, valor: q, placeholder: 'Nombre, correo, teléfono o referencia', ocultos: Object.fromEntries(Object.entries({ vista: vista === 'lista' ? 'lista' : '', etapa: etapa === 'abiertas' ? '' : etapa, fiesta: fiesta === 'todas' ? '' : fiesta }).filter(([, v]) => v !== '')) }}
        etiqueta="Etapa"
        fiestas={{
          actual: fiesta,
          opciones: FIESTAS.map((f) => ({ key: f.key, label: f.label, href: enlace({ fiesta: f.key === 'todas' ? undefined : f.key, n: undefined }), fiesta: f.fiesta })),
        }}
        opciones={
          vista === 'tablero'
            ? []
            : [
                { key: 'abiertas', label: 'Abiertas', href: enlace({ etapa: undefined, n: undefined }) },
                // Saldo pendiente y canceladas solo salen si hay alguna: casi siempre están vacías.
                ...ETAPAS_DE_VENTA.filter((e) => (e.clave !== 'saldo_pendiente' && e.clave !== 'cancelada') || conteo[e.clave] > 0 || etapa === e.clave).map((e) => ({
                  key: e.clave,
                  label: e.etiqueta,
                  href: enlace({ etapa: e.clave, n: undefined }),
                  count: conteo[e.clave],
                })),
                { key: 'todas', label: 'Todas', href: enlace({ etapa: 'todas', n: undefined }) },
              ]
        }
        vista={
          <ConmutadorDeVista
            actual={vista}
            opciones={[
              { key: 'tablero', label: 'Tablero', href: enlace({ vista: 'tablero', etapa: undefined }), icono: <BoardIcon className="size-3.5" /> },
              { key: 'lista', label: 'Lista', href: enlace({ vista: 'lista' }), icono: <ListIcon className="size-3.5" /> },
            ]}
          />
        }
      />

      {ventas.length === 0 ? (
        <PanelCard>
          <EmptyState
            action={
              <PanelButton href={`${BASE}?crear=cotizacion`} variant="primary">
                Crear una cotización
              </PanelButton>
            }
            description="Aquí llega quien escribe desde la web o pide un plan, y lo que tú cotizas. Cada persona es una sola venta, de la consulta a su evento."
            title="Todavía no hay ventas"
          />
        </PanelCard>
      ) : vista === 'tablero' ? (
        <Tablero enlace={enlace} hoy={hoy} ahora={ahora} ventas={visibles} />
      ) : (
        <Lista ahora={ahora} enlace={enlace} hoy={hoy} tope={Number(p.n) > 0 ? Number(p.n) : PAGINA} ventas={visibles} />
      )}

      {abierta !== undefined && !cotizando ? (
        <Ficha
          ahora={ahora}
          cerrar={cerrar}
          cotizarHref={enlace({ venta: abierta.clave, cotizar: '1' })}
          plantillas={isErr(plantillas) ? null : plantillas.value.mensajes}
          venta={abierta}
        />
      ) : null}

      {cotizando ? <Cotizacion cerrar={abierta === undefined ? cerrar : enlace({ venta: abierta.clave })} hoy={hoy} venta={abierta} /> : null}
    </>
  )
}

/** El tablero: una columna por etapa del embudo, con las tarjetas que llevan más tiempo esperando arriba. */
function Tablero({ ventas, enlace, hoy, ahora }: { ventas: readonly Venta[]; enlace: (c: Partial<Params>) => string; hoy: string; ahora: Date }) {
  const columnas = ETAPAS_DE_VENTA.filter((e) => e.tablero && (e.clave !== 'saldo_pendiente' || ventas.some((v) => v.etapa === 'saldo_pendiente')))
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-3">
      <div className="flex flex-col gap-4 min-[900px]:grid min-[900px]:auto-cols-[minmax(172px,1fr)] min-[900px]:grid-flow-col min-[900px]:gap-3">
        {columnas.map((etapa) => {
          const tarjetas = ventas.filter((v) => v.etapa === etapa.clave)
          // Lo cerrado, lo más reciente primero; lo abierto, lo que más espera.
          const orden = etapa.clave === 'cerrada' ? tarjetas.toSorted((a, b) => b.esperaDesde.getTime() - a.esperaDesde.getTime()) : tarjetas
          return (
            // En el celular las columnas se apilan: primero lo que pide acción —pagos sin evento,
            // comprobantes, consultas nuevas—, y las vacías al final.
            <section
              aria-labelledby={`etapa-${etapa.clave}`}
              className={`flex min-w-0 flex-col rounded-[20px] border border-line-panel bg-bg-sunken/55 p-2.5 ${
                tarjetas.length === 0 ? 'max-[899px]:order-last' : etapa.accion ? 'max-[899px]:order-first' : ''
              }`}
              key={etapa.clave}
            >
              <header className="flex items-start justify-between gap-2 px-1.5 pt-1 pb-2.5">
                <span className="min-w-0">
                  <h2 className="truncate text-[13px] font-medium text-ink" id={`etapa-${etapa.clave}`}>
                    {etapa.etiqueta}
                  </h2>
                  <span className="block text-[11.5px] leading-snug text-ink-mute">{etapa.ayuda}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 font-display text-[15px] [font-variant-numeric:lining-nums] ${etapa.accion && tarjetas.length > 0 ? 'bg-ink text-white' : 'text-ink-soft'}`}
                >
                  {tarjetas.length}
                </span>
              </header>
              {tarjetas.length === 0 ? (
                <p className="rounded-[12px] border border-dashed border-line-panel px-3 py-5 text-center text-[12px] text-ink-mute">Nada aquí</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {orden.slice(0, POR_COLUMNA).map((v) => (
                    <li key={v.clave}>
                      <Tarjeta ahora={ahora} href={enlace({ venta: v.clave })} hoy={hoy} venta={v} />
                    </li>
                  ))}
                </ul>
              )}
              {tarjetas.length > POR_COLUMNA ? (
                <Link className="mt-2 px-1.5 text-[12px] text-ink-soft underline underline-offset-4 hover:text-ink" href={enlace({ vista: 'lista', etapa: etapa.clave })}>
                  Ver las {tarjetas.length}
                </Link>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Tarjeta({ venta: v, href, hoy, ahora }: { venta: Venta; href: string; hoy: string; ahora: Date }) {
  const esCotizacion = v.pedido?.origin === 'cotizacion'
  return (
    <Link
      className={`group block rounded-[14px] border bg-white px-3.5 py-3 shadow-card transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:border-ink/40 hover:shadow-float focus-visible:outline-2 focus-visible:outline-ink ${
        v.urgente ? 'border-danger/45' : 'border-line-panel'
      }`}
      href={href}
      scroll={false}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-display text-[16.5px] leading-tight text-ink">{v.nombre}</span>
        <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${puntoDeFiesta(v.fiesta)}`} />
      </span>
      <span className="mt-1 block truncate text-[12px] text-ink-soft">
        {[v.fechaEvento === null ? null : diaCorto(v.fechaEvento, hoy), v.pedido?.producto ?? v.consulta?.categoria ?? null].filter(Boolean).join(' · ') || 'Sin detalles'}
      </span>
      <span className="mt-2 flex items-center justify-between gap-2">
        <span className={`truncate text-[11px] ${v.urgente ? 'text-danger' : 'text-ink-mute'}`}>{hace(v.esperaDesde, ahora)}</span>
        <span className="flex items-center gap-1.5">
          {esCotizacion ? <span className="rounded-full bg-gold/12 px-1.5 py-px font-mono text-[9px] tracking-[0.12em] text-gold-deep uppercase">Cotización</span> : null}
          {v.importeCents === null ? null : <span className="font-display text-[14px] text-ink [font-variant-numeric:lining-nums]">{formatAmount(v.importeCents, 'BOB')}</span>}
        </span>
      </span>
    </Link>
  )
}

/** La lista: todas las ventas del filtro, con sus columnas y «Ver más». */
function Lista({ ventas, enlace, hoy, ahora, tope }: { ventas: readonly Venta[]; enlace: (c: Partial<Params>) => string; hoy: string; ahora: Date; tope: number }) {
  if (ventas.length === 0) return <PanelCard><EmptyState compact title="Ninguna venta con ese filtro" /></PanelCard>
  const pagina = ventas.slice(0, tope)
  return (
    <PanelCard>
      <EncabezadoDeLista columnas={['Venta', 'Evento', 'Etapa', 'Espera', 'Importe']} plantilla={COLUMNAS_DE_LISTA} />
      <ul className="-mx-1 mt-1 flex flex-col">
        {pagina.map((v) => {
          const e = etapaDeVenta(v.etapa)
          return (
            <FilaDeLista
              destacada={v.urgente}
              detalle={[v.pedido?.producto ?? v.consulta?.categoria ?? null, v.pedido?.origin === 'cotizacion' ? 'Cotización' : null, v.pedido?.publicRef ?? null].filter(Boolean).join(' · ') || v.correo || v.telefono || ''}
              fiesta={v.fiesta}
              href={enlace({ venta: v.clave })}
              key={v.clave}
              nombre={v.nombre}
              plantilla={COLUMNAS_DE_LISTA}
            >
              <span className="text-[12.5px] text-ink-soft max-[859px]:hidden">{v.fechaEvento === null ? '—' : diaCorto(v.fechaEvento, hoy)}</span>
              <span className="max-[859px]:col-start-2 max-[859px]:row-start-1 max-[859px]:justify-self-end">
                <Pill tone={e.tono}>{e.una}</Pill>
              </span>
              <span className={`text-[12px] max-[859px]:hidden ${v.urgente ? 'text-danger' : 'text-ink-mute'}`}>{hace(v.esperaDesde, ahora)}</span>
              <span className="text-right font-display text-[16px] text-ink [font-variant-numeric:lining-nums] max-[859px]:hidden">
                {v.importeCents === null ? '—' : formatAmount(v.importeCents, 'BOB')}
              </span>
            </FilaDeLista>
          )
        })}
      </ul>
      {ventas.length > pagina.length ? (
        <div className="mt-4">
          <PanelButton href={enlace({ n: String(tope + PAGINA) })}>Ver {plural(Math.min(PAGINA, ventas.length - pagina.length), 'venta más', 'ventas más')}</PanelButton>
        </div>
      ) : null}
    </PanelCard>
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
  const leido = v.pedido === null ? null : await orders.byRef(v.pedido.publicRef)
  const pedido = leido === null || isErr(leido) ? null : leido.value.order
  const comprobantes = leido === null || isErr(leido) ? [] : leido.value.proofs
  const nombre = v.nombre.split(' ')[0] ?? v.nombre
  const enlacePedido = v.pedido === null ? null : `${env.SITE_URL.replace(/\/$/, '')}/es/pedido/ref/${v.pedido.publicRef}`
  const aPagar = pedido === null ? null : montoAPagar(pedido)
  const fecha = v.fechaEvento === null ? null : diaDelEvento(v.fechaEvento)
  const vars = { nombre, fecha, enlace: enlacePedido, importe: aPagar === null ? null : formatAmount(aPagar, 'BOB'), plan: pedido?.planName ?? null, marca: BRAND.siteName }
  const saludo = v.etapa === 'nueva' && plantillas !== null ? rellenar(plantillas.contacto, vars) : `Hola ${nombre}, te escribimos de ${BRAND.siteName}.`
  const contacto = v.telefono ?? (v.pedido !== null && !v.pedido.contact.includes('@') ? v.pedido.contact : null)

  return (
    <PanelLateral closeHref={cerrar} subtitle={v.pedido === null ? 'Consulta desde la web' : `${v.pedido.producto} · ${v.pedido.publicRef}`} title={v.nombre}>
      <FichaDeVenta
        ahora={ahora}
        comprobantes={comprobantes}
        diseno={pedido?.templateSlug == null ? null : themeFor(pedido.templateSlug).key === pedido.templateSlug ? themeFor(pedido.templateSlug).label : 'Un diseño retirado'}
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
    </PanelLateral>
  )
}

/** El cotizador en su panel: desde una consulta (con sus datos puestos) o desde «+ Crear». */
async function Cotizacion({ venta, cerrar, hoy }: { venta: Venta | undefined; cerrar: string; hoy: string }) {
  const [planesAdmin, extras, eventos, agenda] = await Promise.all([admin.plans(), plans.listActiveExtras(), admin.events(), admin.mensajes()])
  const ocupacion: Record<string, number> = {}
  if (!isErr(eventos)) for (const e of eventos.value) if (e.eventDate >= hoy) ocupacion[e.eventDate] = (ocupacion[e.eventDate] ?? 0) + 1
  const c = venta?.consulta ?? null
  const modelos = themeDefinitions()
    .filter((t) => seAsigna(t.key))
    .map((t) => ({ key: t.key, label: t.label, fiesta: fiestaDeTema(t.key) }))
  return (
    <PanelLateral closeHref={cerrar} subtitle={c === null ? 'Plan, diseño, extras y precio, con su enlace de pago' : `Para ${c.name}`} title="Nueva cotización">
      <Cotizador
        capacidad={isErr(agenda) ? 3 : agenda.value.capacidad}
        cerrarHref={cerrar}
        consulta={c === null ? null : { id: c.id, nombre: c.name, contacto: c.phone ?? c.email ?? '', fecha: c.eventDate, fiesta: c.fiesta }}
        extras={extras.map((x) => ({ slug: x.slug, name: x.name, priceCents: x.priceCents, que: NOMBRE_DE_EFECTO[x.effect] }))}
        hoy={hoy}
        modelos={modelos}
        ocupacion={ocupacion}
        planes={isErr(planesAdmin) ? [] : planesAdmin.value.filter((pl) => pl.isActive).map((pl) => ({ slug: pl.slug, nombre: pl.es?.name ?? pl.slug, priceCents: pl.priceCents, depositPct: pl.depositPct }))}
      />
    </PanelLateral>
  )
}
