import { after } from 'next/server'
import { events, notifications } from '@/app/composition/container'
import { isErr } from '@/shared/result'

/**
 * Le escribe a cada anfitrión del evento que un invitado respondió, si lo tienen encendido.
 *
 * Con `after`, **cuando la respuesta ya salió**: el invitado no espera al correo y, si Resend
 * falla, su confirmación no se entera. Nunca lanza. Los anfitriones son quienes tienen acceso
 * de cliente al evento; sin ninguno, no hay a quién avisar.
 */
export function avisarALosAnfitriones(respuesta: { eventId: string; invitado: string; asistentes: number; mensaje: string | null }): void {
  after(async () => {
    try {
      if (!(await events.avisoDeRespuestas(respuesta.eventId))) return
      const evento = await events.getByIdUnscoped(respuesta.eventId)
      if (isErr(evento)) return
      const anfitriones = await events.staff.listWithEmail(respuesta.eventId, 'cliente')
      await Promise.all(
        anfitriones.map((anfitrion) =>
          notifications.sendRsvpToHost({
            to: anfitrion.email,
            invitado: respuesta.invitado,
            asistentes: respuesta.asistentes,
            mensaje: respuesta.mensaje,
            evento: evento.value.title,
            ruta: `/panel/eventos/${evento.value.slug}/invitados`,
          }),
        ),
      )
    } catch (causa) {
      console.error('no se pudo avisar a los anfitriones:', causa)
    }
  })
}
