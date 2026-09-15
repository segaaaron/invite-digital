import { escapar, type CorreoCompuesto } from './client-access-email'
import { firmaHtml, firmaTexto } from './firma'

/**
 * El aviso al cliente cuando el equipo entra a su panel en modo soporte. Sin enlace al panel:
 * es un aviso, no una puerta. Si no lo esperaba, tiene a quién escribir.
 */
export function supportAccessEmail(input: { eventTitle: string; motivo: string; hora: string; whatsapp: string | null; siteUrl: string }): CorreoCompuesto {
  const contacto = input.whatsapp === null ? 'Si no lo esperabas, responde a quien te atiende.' : `Si no lo esperabas, escríbenos: ${input.whatsapp}`
  const text = [
    `El equipo de Luxury Atelier entró a tu panel de ${input.eventTitle}.`,
    '',
    `Cuándo: ${input.hora}`,
    `Motivo: ${input.motivo}`,
    '',
    'Lo que se cambie queda registrado. Tu contraseña no se ha visto ni cambiado.',
    contacto,
    '',
    'Este buzón no atiende respuestas.',
    '',
    firmaTexto(input.siteUrl),
  ].join('\n')
  const html = [
    `<p>El equipo de Luxury Atelier entró a tu panel de <strong>${escapar(input.eventTitle)}</strong>.</p>`,
    `<p>Cuándo: ${escapar(input.hora)}<br>Motivo: ${escapar(input.motivo)}</p>`,
    '<p>Lo que se cambie queda registrado. Tu contraseña no se ha visto ni cambiado.</p>',
    `<p>${escapar(contacto)}</p>`,
    '<p>Este buzón no atiende respuestas.</p>',
    firmaHtml(input.siteUrl),
  ].join('')
  return { subject: `Entramos a tu panel: ${input.eventTitle}`, text, html }
}
