import { admin } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { MensajesForm } from '@/modules/admin/ui/MensajesForm'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PestanasDeAdmin } from '@/modules/admin'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Mensajes y agenda · Administración' }
export const dynamic = 'force-dynamic'

/** Ajustes › Mensajes y agenda: las plantillas que usa Ventas, la capacidad del calendario y el descuento de recomendación. */
export default async function MensajesPage() {
  await requireAdmin()
  const leido = await admin.mensajes()
  return (
    <>
      <PanelHeader title="Ajustes" tituloEnCelular="Mensajes y agenda" pestanas={<PestanasDeAdmin />} />
      {isErr(leido) ? (
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los ajustes. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      ) : (
        <MensajesForm capacidad={leido.value.capacidad} descuento={leido.value.descuentoReferido} mensajes={leido.value.mensajes} />
      )}
    </>
  )
}
