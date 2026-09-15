import { admin } from '@/app/composition/container'
import { SiteSettingsForm } from '@/modules/admin/ui/SiteSettingsForm'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { fechaHora } from '@/shared/format/fecha'
import { isErr } from '@/shared/result'
import { getDictionary } from '@/shared/i18n/dictionaries'

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
              : versiones.value.map((v) => ({ id: v.id, fecha: fechaHora(v.createdAt), actorEmail: v.actorEmail, campos: v.campos }))
          }
        />
      )}
    </>
  )
}
