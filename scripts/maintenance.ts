/**
 * Un pase de mantenimiento: anonimiza los eventos cuya retención venció y borra las
 * sesiones caducadas. Idempotente — un evento ya anonimizado no vuelve a entrar.
 *
 *   DATABASE_URL=… SITE_URL=… pnpm maintenance
 */
import { events } from '@/app/composition/container'
import { isErr } from '@/shared/result'

async function runMaintenance(): Promise<number> {
  const result = await events.runMaintenance()

  if (isErr(result)) {
    console.error(`Mantenimiento fallido — ${result.error.detail}`)
    return 1
  }

  const { eventsAnonymized, sessionsDeleted, viewsDeleted } = result.value
  console.log(
    `Mantenimiento listo: ${eventsAnonymized.length} evento(s) anonimizado(s)${
      eventsAnonymized.length > 0 ? ` (${eventsAnonymized.join(', ')})` : ''
    }, ${sessionsDeleted} sesión(es) caducada(s) borrada(s), ${viewsDeleted} visita(s) borrada(s)`,
  )
  return 0
}

runMaintenance()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
