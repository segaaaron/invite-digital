import { escapar, type CorreoCompuesto } from './client-access-email'
import { firmaHtml, firmaTexto } from './firma'

/**
 * El aviso a los anfitriones de que un invitado respondió: «Ana Rojas confirmó · 3 personas».
 * Les llega aunque no tengan el panel abierto, que es lo que Joy o Zola hacen con cada RSVP.
 * Lleva su mensaje si dejó uno y el enlace a su lista; lo apagan en Configuración.
 */
export function rsvpHostEmail(input: {
  invitado: string
  asistentes: number
  mensaje: string | null
  evento: string
  enlace: string
  siteUrl: string
}): CorreoCompuesto {
  const titular =
    input.asistentes === 0
      ? `${input.invitado} no podrá asistir`
      : `${input.invitado} confirmó · ${input.asistentes === 1 ? '1 persona' : `${input.asistentes} personas`}`
  const lineas = [`${titular}.`, ...(input.mensaje === null || input.mensaje.trim() === '' ? [] : [`Les dejó un mensaje: «${input.mensaje.trim()}»`])]
  const pie = 'Para dejar de recibir estos avisos, apágalos en Configuración del evento.'
  const text = [...lineas, '', `Ver tu lista: ${input.enlace}`, '', pie, '', firmaTexto(input.siteUrl)].join('\n')
  const html = [
    ...lineas.map((linea) => `<p>${escapar(linea)}</p>`),
    `<p><a href="${escapar(input.enlace)}">Ver tu lista de invitados</a></p>`,
    `<p style="color:#888;font-size:12px">${escapar(pie)}</p>`,
    firmaHtml(input.siteUrl),
  ].join('')
  return { subject: `${titular} — ${input.evento}`, text, html }
}
