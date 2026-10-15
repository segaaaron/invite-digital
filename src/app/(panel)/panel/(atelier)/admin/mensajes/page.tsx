import { admin } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { MensajesForm } from '@/modules/admin/ui/MensajesForm'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PestanasDeAdmin } from '@/modules/admin'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { isErr } from '@/shared/result'
import { tr } from '@/shared/i18n/idioma-servidor'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Mensajes y agenda · Administración', 'Messages and calendar · Administration') }
}
export const dynamic = 'force-dynamic'

/** Ajustes › Mensajes y agenda: las plantillas que usa Ventas, la capacidad del calendario y el descuento de recomendación. */
export default async function MensajesPage() {
  const t = await tr()
  await requireAdmin()
  const leido = await admin.mensajes()
  return (
    <>
      <PanelHeader title={t('Ajustes', 'Settings')} tituloEnCelular={t('Mensajes y agenda', 'Messages and calendar')} pestanas={<PestanasDeAdmin />} />
      {isErr(leido) ? (
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            {t('No pudimos leer los ajustes. La base no responde; vuelve a intentarlo en un momento.', 'We could not read the settings. The database is not responding; try again in a moment.')}
          </p>
        </PanelCard>
      ) : (
        <MensajesForm capacidad={leido.value.capacidad} descuento={leido.value.descuentoReferido} mensajes={leido.value.mensajes} />
      )}
    </>
  )
}
