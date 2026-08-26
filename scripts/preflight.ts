/**
 * Puerta previa al despliegue. Se ejecuta con las variables de producción cargadas y
 * sale con código 1 si algún marcador de relleno sigue en su sitio.
 *
 *   set -a; . ./.env.production; set +a; pnpm preflight
 */
import { admin } from '@/app/composition/container'
import { EMPTY_PAYMENT_SETTINGS } from '@/modules/admin/domain/payment-settings'
import { BRAND } from '@/shared/config/brand'
import { checkReleaseReadiness } from '@/shared/config/preflight'
import { isErr } from '@/shared/result'

async function runPreflight(): Promise<number> {
  // Los datos de cobro ya no viven en el código: se leen de la base, que es donde el
  // administrador los edita. Si la base no responde, se tratan como vacíos —y vacíos
  // bloquean—, porque desplegar sin poder comprobarlo no es desplegar comprobado.
  const ajustes = await admin.payment()
  const payment = isErr(ajustes) ? EMPTY_PAYMENT_SETTINGS : ajustes.value
  const blockers = checkReleaseReadiness({
    whatsapp: BRAND.whatsapp,
    email: BRAND.email,
    siteUrl: process.env.SITE_URL ?? '',
    siteDomain: process.env.SITE_DOMAIN ?? '',
    postgresPassword: process.env.POSTGRES_PASSWORD ?? '',
    trustBrands: BRAND.trustBrands,
    payment,
  })

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
