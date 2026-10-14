import { imagenDeTarjeta } from '@/app/_compartir/imagen-de-tarjeta'
import { fiestaDeTema } from '@/modules/events'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { nombreDelCatalogo } from '@/shared/design/theme-catalog'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'

/**
 * La imagen al compartir un modelo (14 oct): su portada nítida sobre el color del diseño, con su nombre, la
 * misma pieza que la vista previa de una invitación de verdad. Antes los modelos se compartían sin imagen.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: crudo, slug } = await params
  const locale = parseLocaleParam(crudo)
  const tema = themeFor(slug)
  if (locale === null || tema.key !== slug || slug === 'clasico') return new Response('No encontrado', { status: 404 })
  const nombre = nombreDelCatalogo(tema.key, locale) ?? tema.label
  // «Invitación digital de boda» / «Digital wedding invitation»: lo que dice el título del modelo tras su nombre.
  const seo = getDictionary(locale).seo
  const tipo = seo.modelTitle.split(' · ')[1]?.split(' | ')[0]?.replace('{fiesta}', seo.fiestaDeModelo[fiestaDeTema(tema.key)]) ?? null
  return imagenDeTarjeta({ themeKey: tema.key, locale }, { antetitulo: tipo, nombres: nombre, fecha: null, titulo: nombre, descripcion: tipo ?? nombre })
}
