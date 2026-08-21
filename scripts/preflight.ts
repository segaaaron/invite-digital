/**
 * Puerta previa al despliegue. Se ejecuta con las variables de producción cargadas y
 * sale con código 1 si algún marcador de relleno sigue en su sitio.
 *
 *   set -a; . ./.env.production; set +a; pnpm preflight
 */
import { BRAND } from '@/shared/config/brand'
import { checkReleaseReadiness } from '@/shared/config/preflight'

function runPreflight(): number {
  const blockers = checkReleaseReadiness({
    whatsapp: BRAND.whatsapp,
    email: BRAND.email,
    siteUrl: process.env.SITE_URL ?? '',
    siteDomain: process.env.SITE_DOMAIN ?? '',
    postgresPassword: process.env.POSTGRES_PASSWORD ?? '',
  })

  if (blockers.length === 0) {
    console.log('Comprobación previa superada: no queda ningún marcador de relleno.')
    return 0
  }

  console.error(`Despliegue detenido — ${blockers.length} punto(s) sin resolver:`)
  for (const blocker of blockers) console.error(`  · ${blocker}`)
  return 1
}

process.exit(runPreflight())
