import { orders } from '@/app/composition/container'
import { requireAdmin } from '@/modules/identity/session-cookie'
import { OrderDecision } from '@/modules/orders/ui/OrderDecision'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { PanelButton, Pill, type PillTone } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Pedidos' }

export const dynamic = 'force-dynamic'

const ESTADO: Record<string, { texto: string; tono: PillTone }> = {
  pending_payment: { texto: 'Esperando pago', tono: 'pending' },
  proof_submitted: { texto: 'Por revisar', tono: 'maybe' },
  approved: { texto: 'Aprobado', tono: 'ok' },
  rejected: { texto: 'Rechazado', tono: 'no' },
}

/**
 * La bandeja de pedidos del Plan B.
 *
 * El contacto del cliente **sí** se enseña aquí, al contrario que en la página pública de
 * seguimiento: es el número al que hay que escribirle para avisarle de la decisión, y
 * esta pantalla vive tras la sesión del atelier.
 *
 * Los comprobantes son enlaces a un route handler, no a `public/`: el fichero lleva
 * nombre, banco y número de cuenta de una persona.
 */
export default async function PedidosPage() {
  // Del admin, no de cada atelier: aquí se ven los datos de contacto de todos los
  // clientes del sistema y se decide sobre pagos. Un atelier recibe 404.
  await requireAdmin()

  const lista = await orders.list()

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

  return (
    <>
      <PanelHeader kicker="Administración" title="Pedidos" />

      {lista.value.length === 0 ? (
        <PanelCard>
          <p className="text-[13px] text-ink-mute">
            Todavía no hay pedidos. Aparecen aquí en cuanto alguien reserva un plan desde la web.
          </p>
        </PanelCard>
      ) : (
        <div className="flex flex-col gap-4.5">
          {lista.value.map(({ order, proofs }) => (
            <PanelCard key={order.id} title={`${order.customerName} · ${order.publicRef}`}>
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Pill tone={ESTADO[order.status]?.tono ?? 'pending'}>
                    {ESTADO[order.status]?.texto ?? order.status}
                  </Pill>
                  <span className="text-[13px] text-ink-soft">{order.planName ?? 'Plan retirado del catálogo'}</span>
                  <span className="text-[12px] text-ink-mute">
                    {order.eventDate ?? 'Sin fecha'} · {order.contact}
                  </span>
                </div>

                {order.notes === null ? null : <p className="text-[13px] text-ink-soft">{order.notes}</p>}

                {proofs.length === 0 ? (
                  <p className="text-[12px] text-ink-mute">Sin comprobante todavía.</p>
                ) : (
                  <ul className="flex flex-wrap gap-2.5">
                    {proofs.map((proof) => (
                      <li key={proof.id}>
                        <a
                          className="inline-block rounded-[var(--radius-pill)] border border-line-panel-strong bg-white px-3.5 py-1.5 font-mono text-[10px] tracking-[0.25em] text-ink uppercase"
                          href={`/panel/pedidos/comprobante/${proof.id}`}
                        >
                          {/* Texto y nada más: React lo escapa, y nunca se usa para
                              construir una ruta. */}
                          {proof.originalName}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}

                {order.status === 'proof_submitted' ? <OrderDecision orderId={order.id} /> : null}

                {/* Lo que salió de aprobar, leído **de la base**.
                    No puede salir del estado de la acción: al aprobar, el pedido deja de
                    estar «por revisar» y `OrderDecision` se desmonta con su mensaje
                    dentro. Esto sobrevive a recargar, que es lo que el atelier hace. */}
                {order.status === 'approved' && order.eventSlug !== null ? (
                  <p className="flex flex-wrap items-center gap-2.5 text-[13px] text-ink-soft">
                    Boda creada.
                    <PanelButton href={`/panel/eventos/${order.eventSlug}/configuracion`}>Abrir la boda</PanelButton>
                  </p>
                ) : null}

                {order.status === 'approved' && order.eventSlug === null ? (
                  <p className="text-[12px] text-ink-mute">
                    Aprobado sin crear la boda: hacía falta la fecha del evento y el correo del cliente. Créala desde
                    «Nuevo evento» y dale acceso en su Configuración.
                  </p>
                ) : null}

                {order.decisionNote === null ? null : (
                  <p className="text-[12px] text-ink-mute">Nota enviada al cliente: {order.decisionNote}</p>
                )}
              </div>
            </PanelCard>
          ))}
        </div>
      )}
    </>
  )
}
