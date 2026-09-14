import { admin } from '@/app/composition/container'
import { PaymentSettingsForm } from '@/modules/admin/ui/PaymentSettingsForm'
import { requireAdmin } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { EMPTY_PAYMENT_SETTINGS } from '@/modules/admin/domain/payment-settings'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Cobros' }
export const dynamic = 'force-dynamic'

export default async function AdminPagosPage() {
  await requireAdmin()
  const ajustes = await admin.payment()

  return (
    <>
      <PanelHeader
        kicker="Administración"
        meta="Lo que ve quien acaba de hacer un pedido desde la web"
        title="Datos de cobro"
      />

      <PanelCard>
        {isErr(ajustes) ? (
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los datos de cobro. La base no responde; vuelve a intentarlo en un momento.
          </p>
        ) : (
          <PaymentSettingsForm settings={ajustes.value ?? EMPTY_PAYMENT_SETTINGS} />
        )}
      </PanelCard>
    </>
  )
}
