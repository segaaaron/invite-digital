import { admin } from '@/app/composition/container'
import { SiteSettingsForm } from '@/modules/admin/ui/SiteSettingsForm'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PestanasDeAdmin } from '@/modules/admin'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { EyeIcon } from '@/shared/design/ui/icons'
import { fechaHora } from '@/shared/format/fecha'
import { isErr } from '@/shared/result'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'

/** Lo que Google enseña de cada página cuando «Buscadores» está vacío: los textos del diccionario. */
function seoPorDefecto() {
  const es = getDictionary('es')
  const en = getDictionary('en')
  const par = (a: string, b: string) => ({ es: a, en: b })
  return {
    inicio: { titulo: par(es.seo.homeTitle, en.seo.homeTitle), descripcion: par(es.seo.homeDescription, en.seo.homeDescription) },
    colecciones: { titulo: par(es.seo.collectionsTitle, en.seo.collectionsTitle), descripcion: par(es.seo.collectionsDescription, en.seo.collectionsDescription) },
    bodas: { titulo: par(es.fiestas.boda.seoTitle, en.fiestas.boda.seoTitle), descripcion: par(es.fiestas.boda.seoDescription, en.fiestas.boda.seoDescription) },
    xv: { titulo: par(es.fiestas.xv.seoTitle, en.fiestas.xv.seoTitle), descripcion: par(es.fiestas.xv.seoDescription, en.fiestas.xv.seoDescription) },
  }
}

export async function generateMetadata() {
  const t = await tr()
  return { title: t('La web · Administración', 'The website · Administration') }
}
export const dynamic = 'force-dynamic'

/**
 * «La web»: lo que la web pública enseña del negocio —contacto, ubicación, redes, pruebas
 * sociales, textos legales y buscadores—, editable sin tocar código y con historial.
 */
export default async function AdminWebPage() {
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  await requireAdmin()
  const [ajustes, versiones] = await Promise.all([admin.siteSettings(), admin.siteVersions(20)])

  return (
    <>
      <PanelHeader
        actions={
          <PanelButton className="max-[767px]:hidden" external href="/es">
            <EyeIcon className="size-4" /> {t('Ver la web', 'See the website')}
          </PanelButton>
        }
        pestanas={<PestanasDeAdmin />}
        title={t('La web', 'The website')}
      />

      {isErr(ajustes) ? (
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            {t('No pudimos leer los datos de la web. La base no responde; vuelve a intentarlo en un momento.', 'We could not read the website data. The database is not responding; try again in a moment.')}
          </p>
        </PanelCard>
      ) : (
        // La clave es la última versión: tras guardar o restaurar, el formulario se vuelve a
        // montar con lo que hay en la base. Sin ella seguiría enseñando lo de antes de
        // restaurar, y un «Guardar» pisaría la restauración.
        <SiteSettingsForm
          key={isErr(versiones) ? 'sin-historial' : (versiones.value[0]?.id ?? 'sin-versiones')}
          inicial={ajustes.value}
          seoPorDefecto={seoPorDefecto()}
          versiones={
            isErr(versiones)
              ? []
              : versiones.value.map((v) => ({ id: v.id, fecha: fechaHora(v.createdAt, locale), actorEmail: v.actorEmail, campos: v.campos }))
          }
        />
      )}
    </>
  )
}
