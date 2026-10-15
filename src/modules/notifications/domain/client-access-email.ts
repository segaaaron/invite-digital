import type { Locale } from '@/shared/i18n/locales'
import { traductor } from '@/shared/i18n/t'
import { firmaHtml, firmaTexto } from './firma'

/**
 * El correo que recibe el cliente cuando le dan acceso a su boda.
 *
 * Puro: compone asunto y cuerpo, y no sabe quién lo manda. Así se prueba entero y el
 * adaptador solo tiene que entregarlo.
 */

export type AccesoDeCliente = {
  readonly email: string
  /**
   * La contraseña inicial, o `null` si ya tenía cuenta.
   *
   * **`null` no es un hueco que rellenar con un valor de ejemplo.** Cuando el correo ya
   * existe no se le toca la contraseña —cambiarla escribiendo su correo sería una forma
   * de robarle la cuenta—, así que el mensaje tiene que decirle que entre con la suya de
   * siempre, no darle una que no funciona.
   */
  readonly password: string | null
  readonly eventTitle: string
  readonly panelUrl: string
  /** A dónde escribir de verdad: este buzón no atiende respuestas. */
  readonly whatsapp: string | null
  /** La web, para la firma. */
  readonly siteUrl: string
  /** El idioma de quien lo recibe (`users.locale`); sin él, español. */
  readonly locale?: Locale | undefined
}

export type CorreoCompuesto = {
  readonly subject: string
  readonly text: string
  readonly html: string
}

export const escapar = (valor: string): string =>
  valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

export function clientAccessEmail(input: AccesoDeCliente): CorreoCompuesto {
  const t = traductor(input.locale ?? 'es')
  const conClave = input.password !== null && input.password !== ''

  const lineaClave = conClave
    ? t(`Contraseña: ${input.password}`, `Password: ${input.password}`)
    : t('Entra con la contraseña que ya usabas: no la hemos cambiado.', 'Sign in with the password you already used: we have not changed it.')

  const aviso = conClave
    ? t('Cámbiala en «Mi cuenta» la primera vez que entres.', 'Change it in “My account” the first time you sign in.')
    : t('Si no la recuerdas, escríbenos y te damos una nueva.', 'If you do not remember it, write to us and we will give you a new one.')

  const contacto = input.whatsapp === null ? '' : t(`\nDudas: ${input.whatsapp}`, `\nQuestions: ${input.whatsapp}`)
  const yaPuedes = t('Ya puedes seguir tu invitación:', 'You can now follow your invitation:')
  const desdeTuPanel = t(
    'Desde tu panel ves quién ha confirmado, tu lista de invitados, las mesas, la mesa de regalos y los mensajes que les dejan. Y repartes los enlaces de la invitación.',
    'From your panel you see who has RSVPed, your guest list, the tables, the gift registry and the messages they leave. And you send the invitation links.',
  )
  const usuario = t('Usuario', 'Username')
  const buzon = t('Este buzón no atiende respuestas.', 'This mailbox does not take replies.')

  const text = [
    `${yaPuedes} ${input.eventTitle}`,
    '',
    desdeTuPanel,
    '',
    t(`Entra en: ${input.panelUrl}`, `Sign in at: ${input.panelUrl}`),
    `${usuario}: ${input.email}`,
    lineaClave,
    '',
    aviso,
    '',
    buzon + contacto,
    '',
    firmaTexto(input.siteUrl),
  ].join('\n')

  const html = [
    `<p>${yaPuedes} <strong>${escapar(input.eventTitle)}</strong>.</p>`,
    `<p>${desdeTuPanel}</p>`,
    `<p><a href="${escapar(input.panelUrl)}">${t('Entrar a mi panel', 'Open my panel')}</a></p>`,
    `<p>${usuario}: <strong>${escapar(input.email)}</strong><br>${escapar(lineaClave)}</p>`,
    `<p>${escapar(aviso)}</p>`,
    `<p>${buzon}${input.whatsapp === null ? '' : t(` Dudas: ${escapar(input.whatsapp)}`, ` Questions: ${escapar(input.whatsapp)}`)}</p>`,
    firmaHtml(input.siteUrl),
  ].join('')

  return {
    subject: t(`Tu acceso a ${input.eventTitle}`, `Your access to ${input.eventTitle}`),
    text,
    html,
  }
}
