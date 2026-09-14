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
}

export type CorreoCompuesto = {
  readonly subject: string
  readonly text: string
  readonly html: string
}

const escapar = (valor: string): string =>
  valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

export function clientAccessEmail(input: AccesoDeCliente): CorreoCompuesto {
  const conClave = input.password !== null && input.password !== ''

  const lineaClave = conClave
    ? `Contraseña: ${input.password}`
    : 'Entra con la contraseña que ya usabas: no la hemos cambiado.'

  const aviso = conClave
    ? 'Cámbiala en «Mi cuenta» la primera vez que entres.'
    : 'Si no la recuerdas, escríbenos y te damos una nueva.'

  const contacto = input.whatsapp === null ? '' : `\nDudas: ${input.whatsapp}`

  const text = [
    `Ya puedes seguir tu invitación: ${input.eventTitle}`,
    '',
    'Desde tu panel ves quién ha confirmado, tu lista de invitados, las mesas, la mesa de',
    'regalos y los mensajes que os dejan. Y repartes los enlaces de la invitación.',
    '',
    `Entra en: ${input.panelUrl}`,
    `Usuario: ${input.email}`,
    lineaClave,
    '',
    aviso,
    '',
    'Este buzón no atiende respuestas.' + contacto,
    '',
    firmaTexto(input.siteUrl),
  ].join('\n')

  const html = [
    `<p>Ya puedes seguir tu invitación: <strong>${escapar(input.eventTitle)}</strong>.</p>`,
    '<p>Desde tu panel ves quién ha confirmado, tu lista de invitados, las mesas, la mesa de regalos y los mensajes que os dejan. Y repartes los enlaces de la invitación.</p>',
    `<p><a href="${escapar(input.panelUrl)}">Entrar a mi panel</a></p>`,
    `<p>Usuario: <strong>${escapar(input.email)}</strong><br>${escapar(lineaClave)}</p>`,
    `<p>${escapar(aviso)}</p>`,
    `<p>Este buzón no atiende respuestas.${input.whatsapp === null ? '' : ` Dudas: ${escapar(input.whatsapp)}`}</p>`,
    firmaHtml(input.siteUrl),
  ].join('')

  return {
    subject: `Tu acceso a ${input.eventTitle}`,
    text,
    html,
  }
}
