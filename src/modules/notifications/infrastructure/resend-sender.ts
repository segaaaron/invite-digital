import { Resend } from 'resend'
import type { EmailSender } from '../application/ports'

/**
 * Entrega por Resend.
 *
 * **Sin clave configurada no envía y lo dice en el registro**, en vez de reventar: en
 * desarrollo no hay proveedor, y quien despliegue sin correo tiene que poder dar de alta
 * clientes igual —la contraseña se sigue enseñando en pantalla—.
 *
 * El remitente vive en el subdominio verificado en Resend, el que tiene el MX, el SPF y
 * la clave DKIM. Mandar desde el dominio raíz sin esos registros acaba en la carpeta de
 * correo no deseado.
 */
export function createResendSender(config: { apiKey: string | undefined; from: string }): EmailSender {
  const cliente = config.apiKey === undefined || config.apiKey === '' ? null : new Resend(config.apiKey)

  return {
    async send(input) {
      if (cliente === null) {
        console.warn('correo no enviado a %s: no hay RESEND_API_KEY configurada', input.to)
        return false
      }

      try {
        const { error } = await cliente.emails.send({
          from: config.from,
          to: input.to,
          subject: input.subject,
          text: input.text,
          html: input.html,
        })

        // Resend devuelve el fallo en el cuerpo, no lanzando: sin mirarlo, un rechazo del
        // proveedor pasaría por envío correcto.
        if (error) {
          console.error('Resend rechazó el correo a %s: %s', input.to, error.message)
          return false
        }

        return true
      } catch (causa) {
        console.error('no se pudo enviar el correo a %s:', input.to, causa)
        return false
      }
    },
  }
}
