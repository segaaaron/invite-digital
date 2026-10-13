import { admin } from '@/app/composition/container'
import { PaymentSettingsForm } from '@/modules/admin/ui/PaymentSettingsForm'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PestanasDeAdmin } from '@/modules/admin'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PanelAlert } from '@/shared/design/ui/panel/PanelKit'
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
      <PanelHeader title="Ajustes" tituloEnCelular="Cobros" pestanas={<PestanasDeAdmin />} />

      {isErr(ajustes) ? (
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los datos de cobro. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      ) : (
        <div className="flex flex-col gap-5">
          {isPayable(ajustes.value) ? null : (
            <PanelAlert tone="error">Hoy tu cliente no ve a dónde pagar: faltan banco, titular o cuenta. La página del pedido le remite a WhatsApp.</PanelAlert>
          )}
          <PaymentSettingsForm settings={ajustes.value ?? EMPTY_PAYMENT_SETTINGS} />
        </div>
      )}
    </>
  )
}
