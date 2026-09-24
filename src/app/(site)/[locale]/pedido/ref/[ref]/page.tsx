import { notFound } from 'next/navigation'
import { admin, orders } from '@/app/composition/container'
import { ProofUpload } from '@/modules/orders/ui/ProofUpload'
import { isPayable } from '@/modules/admin/domain/payment-settings'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'

/** La página del pedido no se indexa: es de una persona y de un pago. */
export const metadata = { robots: { index: false, follow: false } }

/**
 * El seguimiento del pedido por su referencia.
 *
 * **No enseña datos de contacto del cliente.** La referencia es un secreto de baja
 * intensidad —ocho caracteres que se dictan por teléfono—, así que esta página dice el
 * plan, la fecha y el estado, y nada que identifique a nadie por si la referencia acaba
 * en las manos equivocadas.
 *
 * Una referencia desconocida es **404, nunca 403**: igual que los enlaces de invitado.
 */
export default async function SeguimientoPage({ params }: { params: Promise<{ locale: string; ref: string }> }) {
  const { locale: raw, ref } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()

  const dictionary = getDictionary(locale)
  const encontrado = await orders.byRef(ref)
  if (isErr(encontrado)) {
    if (encontrado.error.kind === 'not_found') notFound()
    throw new Error(encontrado.error.detail)
  }

  const { order, proofs } = encontrado.value

  // Los datos de cobro salen de la base, no del código: cambiar un número de cuenta no
  // puede exigir un despliegue.
  const ajustes = await admin.payment()
  const pago = isErr(ajustes) ? null : ajustes.value
  const sePuedePagar = pago !== null && isPayable(pago)

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-7 px-6 pt-32 pb-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[34px] leading-tight font-light text-ink">{dictionary.orders.trackTitle}</h1>
        <p className="font-mono text-[11px] tracking-[0.25em] text-ink-mute uppercase">
          {dictionary.orders.refLabel} · {order.publicRef}
        </p>
        <p className="text-[12px] text-ink-mute">{dictionary.orders.keepRef}</p>
      </header>

      <section className="flex flex-col gap-2 rounded-[18px] border border-line bg-bg-top/60 p-6">
        <h2 className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
          {dictionary.orders.statusHeading}
        </h2>
        <p className="text-[16px] text-ink">{dictionary.orders.status[order.status]}</p>
        {(order.planName ?? order.addonName) === null ? null : <p className="text-[13px] text-ink-soft">{order.planName ?? order.addonName}</p>}
        {order.decisionNote === null ? null : (
          <p className="mt-2 text-[13px] text-ink-soft">
            <span className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
              {dictionary.orders.decisionNote}:{' '}
            </span>
            {order.decisionNote}
          </p>
        )}
      </section>

      {order.status === 'approved' ? null : (
        <>
          <section className="flex flex-col gap-3 rounded-[18px] border border-line bg-bg-top/60 p-6">
            <h2 className="font-display text-[22px] font-light text-ink">{dictionary.orders.payHeading}</h2>

            {/* Media ficha de transferencia es peor que ninguna: quien la ve cree que
                puede pagar y lo descubre cuando ya escribió. Sin los tres datos, se dice
                la verdad y se remite a WhatsApp. */}
            {!sePuedePagar || pago === null ? (
              <p className="text-[13px] leading-[1.7] text-ink-soft">{dictionary.orders.payPending}</p>
            ) : (
              <>
                <p className="text-[13px] leading-[1.7] text-ink-soft">{dictionary.orders.payIntro}</p>
                <dl className="grid gap-1.5 text-[13px] text-ink">
                  <div className="flex gap-2">
                    <dt className="text-ink-mute">{dictionary.orders.bank}:</dt>
                    <dd>{pago.bank}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-ink-mute">{dictionary.orders.accountHolder}:</dt>
                    <dd>{pago.accountHolder}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-ink-mute">{dictionary.orders.accountNumber}:</dt>
                    <dd className="font-mono">{pago.accountNumber}</dd>
                  </div>
                </dl>
                {pago.notes === '' ? null : <p className="text-[12px] text-ink-mute">{pago.notes}</p>}
                {/* Sin QR cargado no se pinta un hueco con un icono roto: los datos
                    escritos bastan para transferir. */}
                {pago.hasQrImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={dictionary.orders.qrAlt} className="w-44 self-start rounded-xl" src="/qr-de-cobro" />
                ) : null}
              </>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-[22px] font-light text-ink">{dictionary.orders.proofHeading}</h2>
            <ProofUpload publicRef={order.publicRef} textos={dictionary.orders.form} />
          </section>
        </>
      )}

      {proofs.length === 0 ? null : (
        <section className="flex flex-col gap-2">
          <h2 className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
            {dictionary.orders.proofsHeading}
          </h2>
          <ul className="flex flex-col gap-1 text-[13px] text-ink-soft">
            {proofs.map((proof) => (
              // El nombre original se enseña como texto y nada más: React lo escapa, y
              // nunca se usa para construir una ruta.
              <li key={proof.id}>
                {proof.originalName} · {new Intl.DateTimeFormat(locale).format(proof.uploadedAt)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
