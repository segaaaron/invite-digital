import type { Locale } from '@/shared/i18n/locales'
import { traductor } from '@/shared/i18n/t'
import type { CorreoCompuesto } from './client-access-email'
import { firmaHtml, firmaTexto } from './firma'

/**
 * El aviso al correo **anterior** cuando la cuenta cambia de dirección (20 oct, F12).
 *
 * Un cambio de credenciales se dice en el buzón que las tenía: es la única forma de que el dueño
 * se entere si no fue él quien lo hizo. Va después del cambio, así que no lleva código ni enlace
 * —ya no hay nada que autorizar desde aquí—, solo a quién escribir.
 */
export function emailChangedNotice(input: { nuevo: string; whatsapp: string | null; siteUrl: string; locale?: Locale }): CorreoCompuesto {
  const t = traductor(input.locale ?? 'es')
  const aviso = t(`El correo de acceso de tu cuenta pasó a ser ${input.nuevo}.`, `Your account’s sign-in email is now ${input.nuevo}.`)
  const quien = t('Lo hizo alguien con la sesión abierta y el código que llegó a esa dirección nueva.', 'It was done by someone with an open session and the code sent to that new address.')
  const siNoFuiste =
    input.whatsapp === null
      ? t('Si no fuiste tú, recupera tu contraseña ahora mismo y escríbenos.', 'If this wasn’t you, reset your password right now and contact us.')
      : t(`Si no fuiste tú, escríbenos ya a ${input.whatsapp}: podemos devolver la cuenta a este correo.`, `If this wasn’t you, message us now at ${input.whatsapp}: we can return the account to this email.`)
  const buzon = t('Este buzón no atiende respuestas.', 'This mailbox does not take replies.')

  const text = [aviso, '', quien, '', siNoFuiste, '', buzon, '', firmaTexto(input.siteUrl)].join('\n')
  const html = [`<p>${aviso}</p>`, `<p>${quien}</p>`, `<p><strong>${siNoFuiste}</strong></p>`, `<p>${buzon}</p>`, firmaHtml(input.siteUrl)].join('')

  return { subject: t('Tu correo de acceso cambió', 'Your sign-in email changed'), text, html }
}
