import { escapar, type CorreoCompuesto } from './client-access-email'
import { firmaHtml, firmaTexto } from './firma'

/**
 * El aviso al admin de que algo le espera: un comprobante que revisar, una consulta que
 * contestar. Hasta ahora solo se veía entrando al panel, y en este negocio gana quien
 * contesta primero.
 *
 * Lleva el enlace a la bandeja —es un aviso interno, para quien ya tiene sesión— y lo justo
 * para saber de qué va sin abrirlo; nada de datos de pago.
 */
export function adminAlertEmail(input: { asunto: string; lineas: readonly string[]; enlace: string; siteUrl: string }): CorreoCompuesto {
  const text = [...input.lineas, '', `Ábrelo en el panel: ${input.enlace}`, '', firmaTexto(input.siteUrl)].join('\n')
  const html = [
    ...input.lineas.map((linea) => `<p>${escapar(linea)}</p>`),
    `<p><a href="${escapar(input.enlace)}">Ábrelo en el panel</a></p>`,
    firmaHtml(input.siteUrl),
  ].join('')
  return { subject: input.asunto, text, html }
}
