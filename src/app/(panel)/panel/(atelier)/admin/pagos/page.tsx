import { admin } from '@/app/composition/container'
import { PaymentSettingsForm } from '@/modules/admin/ui/PaymentSettingsForm'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { EMPTY_PAYMENT_SETTINGS, isPayable } from '@/modules/admin/domain/payment-settings'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Cobros · Administración' }
export const dynamic = 'force-dynamic'

/**
 * Los datos de cobro **con su vista previa al lado**: lo que ve tu cliente en la página de su
 * pedido, con el monto exacto que le toca transferir. Así se ve si falta algo antes de que un
 * cliente lo descubra.
 */
export default async function AdminPagosPage() {
  await requireAdmin()
  const ajustes = await admin.payment()

  return (
    <>
      <PanelHeader kicker="Ajustes" meta="Lo que ve quien acaba de hacer un pedido o recibir una cotización" title="Datos de cobro" />

      {isErr(ajustes) ? (
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los datos de cobro. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      ) : (
        <div className="grid items-start gap-4.5 min-[1100px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <PanelCard>
            <PaymentSettingsForm settings={ajustes.value ?? EMPTY_PAYMENT_SETTINGS} />
          </PanelCard>
          <aside className="min-[1100px]:sticky min-[1100px]:top-24">
            <p className="mb-2 font-mono text-[10px] tracking-[0.18em] text-ink-mute uppercase">Así lo ve tu cliente</p>
            <div className="flex flex-col gap-3 rounded-[22px] border border-line bg-bg-top p-6 shadow-card">
              <p className="font-display text-[22px] font-light text-ink">Paga tu pedido</p>
              {isPayable(ajustes.value) ? (
                <>
                  <div className="border-b border-line pb-3">
                    <p className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">Monto a transferir</p>
                    <p className="font-display text-[30px] leading-none text-ink [font-variant-numeric:lining-nums]">Bs 1.190,00</p>
                  </div>
                  <dl className="grid gap-1.5 text-[13px] text-ink">
                    <div className="flex gap-2">
                      <dt className="text-ink-mute">Banco:</dt>
                      <dd>{ajustes.value.bank}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-ink-mute">Titular:</dt>
                      <dd>{ajustes.value.accountHolder}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-ink-mute">Cuenta:</dt>
                      <dd className="font-mono">{ajustes.value.accountNumber}</dd>
                    </div>
                  </dl>
                  {ajustes.value.notes === '' ? null : <p className="text-[12px] text-ink-mute">{ajustes.value.notes}</p>}
                  {ajustes.value.hasQrImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="El QR de cobro que ve el cliente" className="w-36 self-start rounded-xl" src="/qr-de-cobro" />
                  ) : (
                    <p className="text-[12px] text-ink-mute">Sin QR: el cliente transfiere con los datos escritos.</p>
                  )}
                </>
              ) : (
                <p className="text-[13px] leading-relaxed text-danger-deep">
                  Hoy tu cliente no ve a dónde pagar: faltan banco, titular o cuenta. La página le remite a WhatsApp.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
