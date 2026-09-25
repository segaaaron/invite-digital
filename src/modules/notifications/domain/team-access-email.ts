import { escapar, type CorreoCompuesto } from './client-access-email'
import { firmaHtml, firmaTexto } from './firma'

/**
 * El correo de quien el admin da de alta en Ajustes › Equipo: su usuario, la contraseña
 * provisional y el enlace. Puro, como el del cliente.
 *
 * La contraseña viaja porque es **provisional**: la cuenta nace con `must_change_password` y
 * el panel no se abre hasta que elija una suya.
 */
export type AccesoDelEquipo = {
  readonly email: string
  readonly password: string
  readonly rol: 'admin' | 'atelier' | 'cliente' | 'puerta'
  readonly panelUrl: string
  readonly whatsapp: string | null
  readonly siteUrl: string
}

const PARA_QUE: Record<AccesoDelEquipo['rol'], string> = {
  admin: 'Tienes acceso de administración: ventas, eventos, clientes, catálogo y ajustes.',
  atelier: 'Desde tu panel llevas tus eventos: invitaciones, invitados y el día de la fiesta.',
  cliente: 'Desde tu panel sigues tu evento en cuanto te den acceso a él.',
  puerta: 'Desde tu panel registras el ingreso de los invitados.',
}

export function teamAccessEmail(input: AccesoDelEquipo): CorreoCompuesto {
  const aviso = 'Es una contraseña provisional: al entrar por primera vez te pediremos que elijas una tuya.'
  const contacto = input.whatsapp === null ? '' : `\nDudas: ${input.whatsapp}`

  const text = [
    'Ya tienes acceso al panel.',
    '',
    PARA_QUE[input.rol],
    '',
    `Entra en: ${input.panelUrl}`,
    `Usuario: ${input.email}`,
    `Contraseña: ${input.password}`,
    '',
    aviso,
    '',
    'Este buzón no atiende respuestas.' + contacto,
    '',
    firmaTexto(input.siteUrl),
  ].join('\n')

  const html = [
    '<p>Ya tienes acceso al panel.</p>',
    `<p>${escapar(PARA_QUE[input.rol])}</p>`,
    `<p><a href="${escapar(input.panelUrl)}">Entrar al panel</a></p>`,
    `<p>Usuario: <strong>${escapar(input.email)}</strong><br>Contraseña: <strong>${escapar(input.password)}</strong></p>`,
    `<p>${escapar(aviso)}</p>`,
    `<p>Este buzón no atiende respuestas.${input.whatsapp === null ? '' : ` Dudas: ${escapar(input.whatsapp)}`}</p>`,
    firmaHtml(input.siteUrl),
  ].join('')

  return { subject: 'Tu acceso al panel', text, html }
}
