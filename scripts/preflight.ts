/**
 * Puerta previa al despliegue. Se ejecuta con las variables de producción cargadas y
 * sale con código 1 si algún marcador de relleno sigue en su sitio.
 *
 *   set -a; . ./.env.production; set +a; pnpm preflight
 */
import { eq } from 'drizzle-orm'
import { admin } from '@/app/composition/container'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { db } from '@/shared/db/client'
import { templates } from '@/shared/db/schema'
import { EMPTY_PAYMENT_SETTINGS } from '@/modules/admin/domain/payment-settings'
import { BRAND } from '@/shared/config/brand'
import { readSiteSettings } from '@/modules/admin/application/site-settings-use-cases'
import { drizzleSettingsRepository } from '@/modules/admin/infrastructure/drizzle-settings-repository'
import { checkReleaseReadiness } from '@/shared/config/preflight'
import { isErr } from '@/shared/result'

async function runPreflight(): Promise<number> {
  // Los datos de cobro ya no viven en el código: se leen de la base, que es donde el
  // administrador los edita. Si la base no responde, se tratan como vacíos —y vacíos
  // bloquean—, porque desplegar sin poder comprobarlo no es desplegar comprobado.
  const ajustes = await admin.payment()
  const payment = isErr(ajustes) ? EMPTY_PAYMENT_SETTINGS : ajustes.value
  // El WhatsApp y las marcas también viven en la base («La web»). Sin poder leerla, se
  // tratan como vacíos: un WhatsApp vacío bloquea igual que el marcador.
  const sitio = await readSiteSettings({ settings: drizzleSettingsRepository })()
  const blockers: string[] = checkReleaseReadiness({
    whatsapp: isErr(sitio) ? '' : sitio.value.whatsapp,
    email: BRAND.email,
    siteUrl: process.env.SITE_URL ?? '',
    siteDomain: process.env.SITE_DOMAIN ?? '',
    postgresPassword: process.env.POSTGRES_PASSWORD ?? '',
    trustBrands: isErr(sitio) ? [] : sitio.value.marcas,
    payment,
  })

  // Toda plantilla publicada tiene que apuntar a un tema que el motor sepa pintar. Vender
  // un modelo que no existe como pieza es la clase de fallo que no se descubre hasta que
  // un invitado abre su invitación el día de la boda.
  //
  // Como el resto de esta comprobación: si la base no responde, bloquea. Desplegar sin
  // poder comprobarlo no es desplegar comprobado.
  try {
    const plantillas = await db
      .select({ slug: templates.slug, themeKey: templates.themeKey })
      .from(templates)
      .where(eq(templates.isPublished, true))

    if (plantillas.length === 0) {
      blockers.push('El catálogo no tiene ninguna plantilla publicada: la web no enseñaría ningún modelo')
    }
    for (const fila of plantillas) {
      if (themeFor(fila.themeKey).key !== fila.themeKey) {
        blockers.push(`La plantilla «${fila.slug}» apunta al diseño «${fila.themeKey}», que el motor no conoce`)
      }
    }
  } catch (cause) {
    console.error('No se pudo leer el catálogo de plantillas:', cause)
    blockers.push('No se pudo leer el catálogo de plantillas para comprobar sus diseños')
  }

  if (blockers.length === 0) {
    console.log('Comprobación previa superada: no queda ningún marcador de relleno.')
    return 0
  }

  console.error(`Despliegue detenido — ${blockers.length} punto(s) sin resolver:`)
  for (const blocker of blockers) console.error(`  · ${blocker}`)
  return 1
}

runPreflight()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
