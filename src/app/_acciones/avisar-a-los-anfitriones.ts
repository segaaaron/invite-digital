import { after } from 'next/server'
import { avisos } from '@/app/composition/container'
import { avisoDeMensaje, avisoDeRespuesta } from '@/modules/notifications'

/**
 * Avisa a quienes llevan el evento que un invitado respondió: en la campana y en sus aparatos (push).
 *
 * **Sin correo** (28 de septiembre, pedido del usuario): el correo queda para las cuentas —altas,
 * accesos del equipo, códigos y contraseñas—; lo del día a día llega por la campana y la push.
 * Con `after`, cuando la respuesta ya salió. Nunca lanza.
 */
export function avisarALosAnfitriones(respuesta: { eventId: string; invitado: string; asistentes: number; mensaje: string | null }): void {
  after(async () => {
    await avisos.delEvento(respuesta.eventId, (ev) => avisoDeRespuesta({ ...ev, invitado: respuesta.invitado, lugares: respuesta.asistentes }))
    if (respuesta.mensaje !== null && respuesta.mensaje.trim() !== '') {
      const texto = respuesta.mensaje
      await avisos.delEvento(respuesta.eventId, (ev) => avisoDeMensaje({ ...ev, invitado: respuesta.invitado, texto }))
    }
  })
}
