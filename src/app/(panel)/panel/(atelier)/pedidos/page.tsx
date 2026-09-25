import Link from 'next/link'
import { admin, orders } from '@/app/composition/container'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { requireAdmin } from '@/app/_acciones/sesion'
import { ESTADO_DE_PEDIDO as ESTADO, TarjetaDePedido } from '@/modules/orders/ui/TarjetaDePedido'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PanelAlert, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { SegmentedTabs } from '@/shared/design/ui/panel/SegmentedTabs'
import { isErr } from '@/shared/result'
import { EmptyState, LoadMoreLink } from '@/shared/design/ui/panel/estados'

export const metadata = { title: 'Pedidos' }

export const dynamic = 'force-dynamic'

type Estado = 'pending_payment' | 'proof_submitted' | 'approved' | 'rejected'

/** Lo que pide acción va primero: un comprobante es alguien que ya pagó y espera. */
const ORDEN: Estado[] = ['proof_submitted', 'pending_payment', 'rejected', 'approved']

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
                <span className="font-mono text-[10.5px] tracking-[0.2em] text-ink-mute uppercase">{paso.rotulo}</span>
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
                {visibles.map(({ order, proofs }) => (
                  <TarjetaDePedido diseno={order.templateSlug === null ? null : themeFor(order.templateSlug).label} key={order.id} order={order} proofs={proofs} />
                ))}
                {lista.value.hayMas ? <LoadMoreLink href={verMas} noun="pedidos" remaining={(filtro === 'todos' ? total : conteo(filtro)) - visibles.length} /> : null}
              </div>
            )}
          </>
        )}
      </PanelCard>
    </>
  )
}

