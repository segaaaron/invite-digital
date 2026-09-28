import { orders } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'

/** Una celda CSV: entre comillas si lleva coma, comilla o salto; y sin fórmulas (una celda que empieza por «=» la ejecuta la hoja de cálculo). */
const celda = (valor: string | number | null): string => {
  const texto = valor === null ? '' : String(valor)
  const seguro = /^[=+\-@]/.test(texto) ? `'${texto}` : texto
  return /[",\n]/.test(seguro) ? `"${seguro.replaceAll('"', '""')}"` : seguro
}
const bs = (cents: number | null) => (cents === null ? '' : (cents / 100).toFixed(2))

/**
 * **Lo cobrado, para la contadora**: cada pedido aprobado con su fecha, su referencia, quién pagó,
 * qué compró y cuánto, en un CSV que abre Excel. Tras la sesión del admin, como descarga.
 */
export async function GET() {
  await requireAdmin()
  const leidos = await orders.page({ status: 'approved', tope: 5000, prioridad: ['approved'] })
  if (isErr(leidos)) return new Response('No pudimos leer los pedidos.', { status: 503 })

  const filas = leidos.value.pedidos
    .map(({ order: o }) => o)
    .sort((a, b) => (a.decidedAt?.getTime() ?? 0) - (b.decidedAt?.getTime() ?? 0))
    .map((o) =>
      [
        o.decidedAt === null ? '' : fechaEnBolivia(o.decidedAt),
        o.publicRef,
        o.customerName,
        o.contact,
        o.addonSlug === null ? (o.planName ?? 'Plan retirado') : `Extra ${o.addonName ?? o.addonSlug}`,
        bs(o.amountCents),
        o.currency ?? 'BOB',
        bs(o.depositCents),
        o.balancePaidAt === null ? '' : fechaEnBolivia(o.balancePaidAt),
        bs(o.discountCents),
        o.referralCode ?? '',
        o.eventSlug ?? '',
      ]
        .map(celda)
        .join(','),
    )
  const cabecera = ['fecha_aprobado', 'referencia', 'cliente', 'contacto', 'producto', 'importe', 'moneda', 'anticipo', 'saldo_cobrado_el', 'descuento', 'codigo_referido', 'evento'].join(',')
  // BOM al principio: sin él, Excel abre las tildes rotas.
  return new Response(`﻿${[cabecera, ...filas].join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ingresos-${fechaEnBolivia(new Date())}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
