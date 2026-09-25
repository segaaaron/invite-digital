import type { ReactNode } from 'react'
import { CheckIcon } from '@/shared/design/ui/icons'
import { PanelButton, Pill, type PillTone } from '@/shared/design/ui/panel/PanelKit'
import { enlaceWhatsapp } from '@/shared/whatsapp'
import type { ProofRow } from '../application/ports'
import type { Order } from '../domain/order'
import { OrderDecision } from './OrderDecision'

type Estado = 'pending_payment' | 'proof_submitted' | 'approved' | 'rejected'

export const ESTADO_DE_PEDIDO: Record<Estado, { texto: string; tono: PillTone }> = {
  pending_payment: { texto: 'Esperando pago', tono: 'pending' },
  proof_submitted: { texto: 'Por revisar', tono: 'maybe' },
  approved: { texto: 'Aprobado', tono: 'ok' },
  rejected: { texto: 'Rechazado', tono: 'no' },
}

const CUANDO = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' })

/**
 * Un pedido entero —quién, qué compró, dónde va, comprobantes y la decisión—. Lo pintan la
 * bandeja de Pedidos y el panel lateral de Ventas: una sola tarjeta, un solo sitio donde decidir.
 * `diseno` llega ya resuelto: el registro de temas vive en `events` y este módulo no lo importa.
 */
export function TarjetaDePedido({ order, proofs, diseno }: { order: Order; proofs: readonly ProofRow[]; diseno: string | null }) {
  const estado = ESTADO_DE_PEDIDO[order.status as Estado] ?? ESTADO_DE_PEDIDO.pending_payment
  const paso = order.status === 'approved' ? 4 : order.status === 'proof_submitted' || order.status === 'rejected' ? 3 : 2
  const whatsapp = /^\+?[\d\s-]{8,}$/.test(order.contact) ? enlaceWhatsapp(order.contact.replace(/[^\d+]/g, ''), `Hola ${order.customerName}, te escribimos por tu pedido ${order.publicRef}.`) : null

  return (
    <section
      id={`pedido-${order.publicRef}`}
      className={`flex scroll-mt-6 flex-col gap-4 rounded-[18px] border bg-white p-4 min-[560px]:p-5 ${
        order.status === 'proof_submitted' ? 'border-ink/40 shadow-float' : 'border-line-panel shadow-card'
      }`}
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
            <Dato etiqueta="Diseño">{diseno ?? 'Sin elegir'}</Dato>
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
            <span className="flex items-center gap-1 font-mono text-[10.5px] tracking-[0.15em] text-ink-mute uppercase">
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
          <span className="font-mono text-[10.5px] tracking-[0.2em] text-ink-mute uppercase">Comprobantes</span>
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

      {order.status === 'approved' && order.eventSlug === null && order.addonSlug === null ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-panel pt-4">
          <p className="text-[12px] text-ink-mute">Aprobado sin crear el evento: faltaba la fecha o el correo del cliente.</p>
          <PanelButton href={`/panel/admin/eventos?panel=nueva&pedido=${order.publicRef}`} variant="primary">
            Crear el evento con este pedido
          </PanelButton>
        </div>
      ) : null}

      {order.decisionNote === null ? null : (
        <p className="text-[12px] text-ink-mute">Nota enviada al cliente: {order.decisionNote}</p>
      )}
    </section>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="font-mono text-[10.5px] tracking-[0.25em] text-ink-mute uppercase">{etiqueta}</dt>
      <dd className="truncate text-ink">{children}</dd>
    </div>
  )
}
