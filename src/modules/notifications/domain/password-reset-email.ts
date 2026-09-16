import type { CorreoCompuesto } from './client-access-email'
import { firmaHtml, firmaTexto } from './firma'

/**
 * El correo con el código para recuperar la contraseña.
 *
 * Puro, como el del acceso: compone asunto y cuerpo, y no sabe quién lo manda.
 *
 * **No lleva enlace, solo el código.** Un enlace que cambia la contraseña de un clic es
 * un enlace que funciona para cualquiera que abra ese correo; el código hay que
 * escribirlo en la pantalla donde ya se está pidiendo el cambio.
 */
export function passwordResetEmail(input: { code: string; minutos: number; whatsapp: string | null; siteUrl: string }): CorreoCompuesto {
  const contacto = input.whatsapp === null ? '' : ` Dudas: ${input.whatsapp}`

  const text = [
    `Tu código de seguridad es: ${input.code}`,
    '',
    'Sirve para cambiar tu contraseña o cerrar las sesiones abiertas en otros dispositivos.',
    '',
    `Caduca en ${input.minutos} minutos y sirve una sola vez.`,
    '',
    'Si no lo pediste tú, no hagas nada: sin el código, nadie puede cambiar tu contraseña ni sacarte de tu cuenta.',
    '',
    `Este buzón no atiende respuestas.${contacto}`,
    '',
    firmaTexto(input.siteUrl),
  ].join('\n')

  const html = [
    '<p>Tu código de seguridad es:</p>',
    `<p style="font-size:28px;letter-spacing:6px"><strong>${input.code}</strong></p>`,
    '<p>Sirve para cambiar tu contraseña o cerrar las sesiones abiertas en otros dispositivos.</p>',
    `<p>Caduca en ${input.minutos} minutos y sirve una sola vez.</p>`,
    '<p>Si no lo pediste tú, no hagas nada: sin el código, nadie puede cambiar tu contraseña ni sacarte de tu cuenta.</p>',
    `<p>Este buzón no atiende respuestas.${contacto}</p>`,
    firmaHtml(input.siteUrl),
  ].join('')

  return { subject: `Tu código: ${input.code}`, text, html }
}
