import type { Locale } from '@/shared/i18n/locales'
import { traductor } from '@/shared/i18n/t'
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
export function passwordResetEmail(input: { code: string; minutos: number; whatsapp: string | null; siteUrl: string; locale?: Locale }): CorreoCompuesto {
  const t = traductor(input.locale ?? 'es')
  const contacto = input.whatsapp === null ? '' : t(` Dudas: ${input.whatsapp}`, ` Questions: ${input.whatsapp}`)
  const intro = t('Tu código de seguridad es:', 'Your security code is:')
  const sirve = t('Sirve para cambiar tu contraseña o cerrar las sesiones abiertas en otros dispositivos.', 'Use it to change your password or sign out the sessions open on other devices.')
  const caduca = t(`Caduca en ${input.minutos} minutos y sirve una sola vez.`, `It expires in ${input.minutos} minutes and works only once.`)
  const noFuiste = t('Si no lo pediste tú, no hagas nada: sin el código, nadie puede cambiar tu contraseña ni sacarte de tu cuenta.', 'If you did not ask for it, do nothing: without the code, nobody can change your password or sign you out.')
  const buzon = t('Este buzón no atiende respuestas.', 'This mailbox does not take replies.')

  const text = [
    `${intro} ${input.code}`,
    '',
    sirve,
    '',
    caduca,
    '',
    noFuiste,
    '',
    `${buzon}${contacto}`,
    '',
    firmaTexto(input.siteUrl),
  ].join('\n')

  const html = [
    `<p>${intro}</p>`,
    `<p style="font-size:28px;letter-spacing:6px"><strong>${input.code}</strong></p>`,
    `<p>${sirve}</p>`,
    `<p>${caduca}</p>`,
    `<p>${noFuiste}</p>`,
    `<p>${buzon}${contacto}</p>`,
    firmaHtml(input.siteUrl),
  ].join('')

  return { subject: t(`Tu código: ${input.code}`, `Your code: ${input.code}`), text, html }
}
