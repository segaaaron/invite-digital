/**
 * Un pase de mantenimiento: anonimiza los eventos cuya retención venció y borra las
 * sesiones caducadas. Idempotente — un evento ya anonimizado no vuelve a entrar.
 *
 *   DATABASE_URL=… SITE_URL=… pnpm maintenance
 */
import { avisarLoQueVence, events, leads } from '@/app/composition/container'
import { borrarFallosViejos } from '@/shared/observability/lectura'
import { isErr } from '@/shared/result'

async function runMaintenance(): Promise<number> {
  const result = await events.runMaintenance()

  if (isErr(result)) {
    console.error(`Mantenimiento fallido — ${result.error.detail}`)
    return 1
  }

  const { eventsAnonymized, sessionsDeleted, viewsDeleted, mediaDeleted } = result.value
  console.log(
    `Mantenimiento listo: ${eventsAnonymized.length} evento(s) anonimizado(s)${
      eventsAnonymized.length > 0 ? ` (${eventsAnonymized.join(', ')})` : ''
    }, ${sessionsDeleted} sesión(es) caducada(s) borrada(s), ${viewsDeleted} visita(s) borrada(s), ${mediaDeleted} archivo(s) borrado(s)`,
  )

  // Las consultas de la web van aparte: no son de ningún evento. Un fallo aquí no deshace
  // lo de arriba, pero sí deja el pase en rojo para que se vea en el registro.
  const consultas = await leads.anonymizeExpired()
  if (isErr(consultas)) {
    console.error(`Retención de consultas fallida — ${consultas.error.detail}`)
    return 1
  }
  console.log(`Retención de consultas: ${consultas.value} anonimizada(s)`)

  // Los avisos de la agenda, a la campana y a los aparatos. Nunca lanza por un aviso. Al arrancar el contenedor
  // (`--sin-avisos`) no: salen a las 08:00, no a la hora de un despliegue.
  if (process.argv.includes('--sin-avisos')) {
    console.log('Avisos de agenda: a las 08:00')
  } else {
    try {
      console.log(`Avisos de agenda: ${await avisarLoQueVence(new Date())}`)
    } catch (causa) {
      console.error('Avisos de agenda fallidos —', causa)
      return 1
    }
  }

  // La portada no se personaliza: lo que se subió como portada se borra (idempotente).
  try {
    const portadas = await events.quitarFotosDePortada()
    console.log(`Fotos de portada: ${portadas.contenidos} contenido(s) limpiado(s), ${portadas.fotos} foto(s) borrada(s)`)
  } catch (causa) {
    console.error('Limpieza de fotos de portada fallida —', causa)
    return 1
  }

  // El registro de fallos guarda 30 días.
  try {
    console.log(`Registro de fallos: ${await borrarFallosViejos(new Date())} borrado(s)`)
  } catch (causa) {
    console.error('Limpieza del registro de fallos fallida —', causa)
    return 1
  }
  return 0
}

runMaintenance()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
