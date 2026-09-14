import { admin } from '@/app/composition/container'
import { SiteSettingsForm } from '@/modules/admin/ui/SiteSettingsForm'
import { requireAdmin } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { fechaHora } from '@/shared/format/fecha'
import { isErr } from '@/shared/result'

export const metadata = { title: 'La web · Administración' }
export const dynamic = 'force-dynamic'

/**
 * «La web»: lo que la web pública enseña del negocio —contacto, ubicación, redes, pruebas
 * sociales, textos legales y buscadores—, editable sin tocar código y con historial.
 */
export default async function AdminWebPage() {
  await requireAdmin()
  const [ajustes, versiones] = await Promise.all([admin.siteSettings(), admin.siteVersions(20)])

  return (
    <>
      <PanelHeader kicker="Administración" meta="Lo que la web pública enseña del negocio, sin tocar código" title="La web" />

      {isErr(ajustes) ? (
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los datos de la web. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      ) : (
        <SiteSettingsForm
          inicial={ajustes.value}
          versiones={
            isErr(versiones)
              ? []
              : versiones.value.map((v) => ({ id: v.id, fecha: fechaHora(v.createdAt), actorEmail: v.actorEmail, campos: v.campos }))
          }
        />
      )}
    </>
  )
}
