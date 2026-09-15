import Link from 'next/link'
import { admin, orders } from '@/app/composition/container'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { requireAdmin } from '@/app/_acciones/sesion'
import { OrderDecision } from '@/modules/orders/ui/OrderDecision'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { CheckIcon } from '@/shared/design/ui/icons'
import { PanelAlert, PanelButton, Pill, type PillTone } from '@/shared/design/ui/panel/PanelKit'
import { SegmentedTabs } from '@/shared/design/ui/panel/SegmentedTabs'
import { enlaceWhatsapp } from '@/shared/whatsapp'
import { isErr } from '@/shared/result'
import { EmptyState, LoadMoreLink } from '@/shared/design/ui/panel/estados'

export const metadata = { title: 'Pedidos' }

export const dynamic = 'force-dynamic'

type Estado = 'pending_payment' | 'proof_submitted' | 'approved' | 'rejected'

const ESTADO: Record<Estado, { texto: string; tono: PillTone }> = {
  pending_payment: { texto: 'Esperando pago', tono: 'pending' },
  proof_submitted: { texto: 'Por revisar', tono: 'maybe' },
  approved: { texto: 'Aprobado', tono: 'ok' },
  rejected: { texto: 'Rechazado', tono: 'no' },
}

/** Lo que pide acción va primero: un comprobante es alguien que ya pagó y espera. */
const ORDEN: Estado[] = ['proof_submitted', 'pending_payment', 'rejected', 'approved']

const CUANDO = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' })

/**
 * La bandeja de pedidos: las compras de un plan hechas desde la web, pagadas por
 * transferencia.
 *
 * **El recorrido va a la vista, siempre**, con cuántos pedidos hay en cada paso: sin él la
 * pantalla vacía no decía de dónde salen los pedidos ni qué hacer con uno. Y avisa arriba si
 * faltan los datos de cobro, porque sin ellos el cliente llega a pagar y no tiene a dónde.
 *
 * El contacto del cliente **sí** se enseña aquí, al contrario que en la página pública de
 * seguimiento: es a quien hay que avisar de la decisión, y esta pantalla vive tras la sesión.
 * Los comprobantes son enlaces a un route handler, no a `public/`: llevan datos bancarios.
 */
/** Pedidos por página; «Ver más» sube el tope en la dirección, como en Auditoría. */
const PAGINA = 20

export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ estado?: string; n?: string }> }) {
  // Del admin: aquí se ven los contactos de todos los clientes y se decide sobre pagos.
  await requireAdmin()

  const { estado: pedido, n } = await searchParams
  const filtro: Estado | 'todos' = ORDEN.find((e) => e === pedido) ?? 'todos'
  const pedidoTope = Number(n)
  const tope = Number.isInteger(pedidoTope) && pedidoTope > 0 ? Math.min(pedidoTope, 500) : PAGINA
  const [lista, cobro] = await Promise.all([orders.page({ status: filtro === 'todos' ? null : filtro, tope, prioridad: ORDEN }), admin.payment()])

  if (isErr(lista)) {
    return (
      <>
        <PanelHeader kicker="Administración" title="Pedidos" />
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los pedidos. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      </>
    )
  }

  // Recuento de la base, página cortada en la base: nada se filtra ni se ordena en memoria.
  const conteo = (estado: Estado) => lista.value.conteo[estado]
  const total = ORDEN.reduce((suma, e) => suma + conteo(e), 0)
  const visibles = lista.value.pedidos
  const verMas = `/panel/pedidos?${filtro === 'todos' ? '' : `estado=${filtro}&`}n=${tope + PAGINA}`
  const cobroListo = !isErr(cobro) && cobro.value.bank !== '' && cobro.value.accountHolder !== '' && cobro.value.accountNumber !== ''

  const PASOS = [
    { titulo: 'Elige su plan en la web', detalle: 'Pulsa el plan en «Precios» y deja nombre, contacto y fecha.', cifra: total, rotulo: 'pedidos' },
    { titulo: 'Paga y sube el comprobante', detalle: 'Transfiere a tus datos de cobro o paga con el QR.', cifra: conteo('pending_payment'), rotulo: 'esperando pago' },
    { titulo: 'Tú revisas el pago', detalle: 'Abres el comprobante y apruebas, o rechazas con una nota.', cifra: conteo('proof_submitted'), rotulo: 'por revisar' },
    { titulo: 'Se crea su evento', detalle: 'Al aprobar nace el evento con su diseño, su plan y su acceso.', cifra: conteo('approved'), rotulo: 'aprobados' },
  ]

  return (
    <>
      <PanelHeader
        actions={
          <>
            <PanelButton external href="/es#precios">
              Ver los precios en la web
            </PanelButton>
            <PanelButton href="/panel/admin/pagos">Datos de cobro</PanelButton>
          </>
        }
        kicker="Administración"
        meta="Las compras de un plan desde la web, pagadas por transferencia"
        title="Pedidos"
      />

      {cobroListo ? null : (
        <div className="mb-4.5">
          <PanelAlert tone="error">
            Faltan tus datos de cobro (banco, titular y cuenta). Sin ellos, quien pide un plan no ve a dónde pagar.{' '}
            <Link className="font-medium underline underline-offset-4" href="/panel/admin/pagos">
              Cargarlos ahora
            </Link>
          </PanelAlert>
        </div>
      )}

      {/* El recorrido de un pedido, con cuántos hay en cada paso. */}
      <ol className="mb-4.5 grid gap-3 min-[560px]:grid-cols-2 min-[1100px]:grid-cols-4">
        {PASOS.map((paso, i) => (
          <li className="relative flex flex-col gap-2 rounded-[18px] border border-line-panel bg-white p-4 shadow-card" key={paso.titulo}>
            <span className="flex items-center justify-between">
              <span className="grid size-7 place-items-center rounded-full bg-ink font-display text-[14px] text-white [font-variant-numeric:lining-nums]">{i + 1}</span>
              <span className="text-right">
                <span className="block font-display text-[26px] leading-none text-ink [font-variant-numeric:lining-nums]">{paso.cifra}</span>
                <span className="font-mono text-[9px] tracking-[0.2em] text-ink-mute uppercase">{paso.rotulo}</span>
              </span>
            </span>
            <span className="font-display text-[17px] leading-tight text-ink">{paso.titulo}</span>
            <span className="text-[12px] leading-[1.5] text-ink-soft">{paso.detalle}</span>
          </li>
        ))}
      </ol>

      <PanelCard title="Bandeja">
        {total === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="font-display text-[22px] text-ink">Todavía no hay pedidos</p>
            <p className="max-w-[460px] text-[13px] leading-[1.7] text-ink-soft">
              Aparecen aquí en cuanto alguien pide un plan desde la web. Pruébalo tú mismo: entra a los precios, pulsa un
              plan y registra un pedido de prueba.
            </p>
            <PanelButton external href="/es#precios" variant="primary">
              Hacer un pedido de prueba
            </PanelButton>
          </div>
        ) : (
          <>
            <div className="-mx-1 mb-4 overflow-x-auto px-1 pb-1">
              <SegmentedTabs
                current={filtro}
                label="Filtrar pedidos por estado"
                segments={[
                  { key: 'todos', label: 'Todos', href: '/panel/pedidos', count: total },
                  ...ORDEN.map((e) => ({ key: e, label: ESTADO[e].texto, href: `/panel/pedidos?estado=${e}`, count: conteo(e) })),
                ]}
              />
            </div>

            {visibles.length === 0 ? (
              <EmptyState title="Ningún pedido en este estado." />
            ) : (
              <div className="flex flex-col gap-3.5">
                {visibles.map(({ order, proofs }) => {
                  const estado = ESTADO[order.status as Estado] ?? ESTADO.pending_payment
                  const paso = order.status === 'approved' ? 4 : order.status === 'proof_submitted' || order.status === 'rejected' ? 3 : 2
                  const whatsapp = /^\+?[\d\s-]{8,}$/.test(order.contact) ? enlaceWhatsapp(order.contact.replace(/[^\d+]/g, ''), `Hola ${order.customerName}, te escribimos por tu pedido ${order.publicRef}.`) : null

                  return (
                    <section
                      className={`flex flex-col gap-4 rounded-[18px] border bg-white p-4 min-[560px]:p-5 ${
                        order.status === 'proof_submitted' ? 'border-ink/40 shadow-float' : 'border-line-panel shadow-card'
                      }`}
                      key={order.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="flex flex-wrap items-center gap-2.5">
                            <h2 className="font-display text-[22px] leading-tight text-ink">{order.customerName}</h2>
                            <Pill tone={estado.tono}>{estado.texto}</Pill>
                          </span>
                          <span className="font-mono text-[10px] tracking-[0.15em] text-ink-mute uppercase">
                            {order.publicRef} · pedido el {CUANDO.format(order.createdAt)}
                          </span>
                        </span>
                        {whatsapp === null ? null : (
                          <PanelButton external href={whatsapp}>
                            Escribirle por WhatsApp
                          </PanelButton>
                        )}
                      </div>

                      <dl className="grid gap-3 text-[13px] min-[560px]:grid-cols-4">
                        {order.addonSlug !== null ? (
                          <>
                            <Dato etiqueta="Extra">{order.addonName ?? order.addonSlug}</Dato>
                            <Dato etiqueta="Para el evento">{order.eventSlug ?? '—'}</Dato>
                            <Dato etiqueta="Al aprobar">Se aplica al evento</Dato>
                          </>
                        ) : (
                          <>
                            <Dato etiqueta="Plan">{order.planName ?? 'Plan retirado del catálogo'}</Dato>
                            <Dato etiqueta="Diseño">{order.templateSlug === null ? 'Sin elegir' : themeFor(order.templateSlug).label}</Dato>
                            <Dato etiqueta="Fecha del evento">{order.eventDate ?? 'Sin fecha'}</Dato>
                          </>
                        )}
                        <Dato etiqueta="Contacto">{order.contact}</Dato>
                      </dl>

                      {/* Dónde está este pedido en el recorrido. */}
                      <ol aria-label="Progreso del pedido" className="grid grid-cols-4 gap-1.5">
                        {['Pedido', 'Pago', 'Revisión', 'Evento'].map((nombre, i) => (
                          <li className="flex flex-col gap-1.5" key={nombre}>
                            <span className={`h-1.5 rounded-full ${i + 1 <= paso ? (order.status === 'rejected' && i === 2 ? 'bg-danger' : 'bg-sage') : 'bg-bg-sunken'}`} />
                            <span className="flex items-center gap-1 font-mono text-[9px] tracking-[0.15em] text-ink-mute uppercase">
                              {i + 1 < paso || order.status === 'approved' ? <CheckIcon className="size-3 text-sage" /> : null}
                              {nombre}
                            </span>
                          </li>
                        ))}
                      </ol>

                      {order.notes === null ? null : (
                        <p className="rounded-[12px] bg-bg-sunken px-3.5 py-2.5 text-[13px] text-ink-soft">«{order.notes}»</p>
                      )}

                      {proofs.length === 0 ? (
                        <p className="text-[12px] text-ink-mute">Sin comprobante todavía: el cliente aún no subió su pago.</p>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono text-[9px] tracking-[0.2em] text-ink-mute uppercase">Comprobantes</span>
                          {proofs.map((proof) => (
                            <a
                              className="inline-block rounded-[var(--radius-pill)] border border-line-panel-strong bg-white px-3.5 py-1.5 font-mono text-[10px] tracking-[0.2em] text-ink uppercase hover:border-ink"
                              href={`/panel/pedidos/comprobante/${proof.id}`}
                              key={proof.id}
                            >
                              {/* Texto y nada más: React lo escapa, y nunca se usa para construir una ruta. */}
                              {proof.originalName}
                            </a>
                          ))}
                        </div>
                      )}

                      {order.status === 'proof_submitted' ? (
                        <div className="border-t border-line-panel pt-4">
                          <OrderDecision esExtra={order.addonSlug !== null} orderId={order.id} />
                        </div>
                      ) : null}

                      {/* Lo que salió de aprobar, leído **de la base**: el formulario de decisión
                          se desmonta al aprobar, y esto sobrevive a recargar. */}
                      {order.status === 'approved' && order.eventSlug !== null ? (
                        <p className="flex flex-wrap items-center gap-2.5 border-t border-line-panel pt-4 text-[13px] text-ink-soft">
                          <CheckIcon className="size-4 text-sage" /> Evento creado con su acceso.
                          <PanelButton href={`/panel/eventos/${order.eventSlug}/configuracion`}>Abrir el evento</PanelButton>
                        </p>
                      ) : null}

                      {order.status === 'approved' && order.eventSlug === null ? (
                        <p className="border-t border-line-panel pt-4 text-[12px] text-ink-mute">
                          Aprobado sin crear el evento: faltaba la fecha o el correo del cliente. Créalo desde «Todos los
                          eventos» → «+ Evento para un cliente».
                        </p>
                      ) : null}

                      {order.decisionNote === null ? null : (
                        <p className="text-[12px] text-ink-mute">Nota enviada al cliente: {order.decisionNote}</p>
                      )}
                    </section>
                  )
                })}
                {lista.value.hayMas ? <LoadMoreLink href={verMas} noun="pedidos" remaining={(filtro === 'todos' ? total : conteo(filtro)) - visibles.length} /> : null}
              </div>
            )}
          </>
        )}
      </PanelCard>
    </>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="font-mono text-[9px] tracking-[0.25em] text-ink-mute uppercase">{etiqueta}</dt>
      <dd className="truncate text-ink">{children}</dd>
    </div>
  )
}
