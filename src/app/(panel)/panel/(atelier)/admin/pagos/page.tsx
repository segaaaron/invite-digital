import { admin } from '@/app/composition/container'
import { PaymentSettingsForm } from '@/modules/admin/ui/PaymentSettingsForm'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PestanasDeAdmin } from '@/modules/admin'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PanelAlert } from '@/shared/design/ui/panel/PanelKit'
import { EMPTY_PAYMENT_SETTINGS, isPayable } from '@/modules/admin/domain/payment-settings'
import { isErr } from '@/shared/result'
import { tr } from '@/shared/i18n/idioma-servidor'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Cobros · Administración', 'Payments · Administration') }
}
export const dynamic = 'force-dynamic'

/**
 * Los datos de cobro **con su vista previa al lado**: lo que ve tu cliente en la página de su
 * pedido, con el monto exacto que le toca transferir. Así se ve si falta algo antes de que un
 * cliente lo descubra.
 */
export default async function AdminPagosPage() {
  const t = await tr()
  await requireAdmin()
  const ajustes = await admin.payment()

  return (
    <>
      <PanelHeader title={t('Ajustes', 'Settings')} tituloEnCelular={t('Cobros', 'Payments')} pestanas={<PestanasDeAdmin />} />

      {isErr(ajustes) ? (
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            {t('No pudimos leer los datos de cobro. La base no responde; vuelve a intentarlo en un momento.', 'We could not read the payment details. The database is not responding; try again in a moment.')}
          </p>
        </PanelCard>
      ) : (
        <div className="flex flex-col gap-5">
          {isPayable(ajustes.value) ? null : (
            <PanelAlert tone="error">{t('Hoy tu cliente no ve a dónde pagar: faltan banco, titular o cuenta. La página del pedido le remite a WhatsApp.', 'Right now your client cannot see where to pay: bank, holder or account is missing. The order page sends them to WhatsApp.')}</PanelAlert>
          )}
          <PaymentSettingsForm settings={ajustes.value ?? EMPTY_PAYMENT_SETTINGS} />
        </div>
      )}
    </>
  )
}
