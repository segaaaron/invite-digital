import type { Locale } from '@/shared/i18n/locales'
import { traductor, type T } from '@/shared/i18n/t'
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
  readonly locale?: Locale | undefined
}

const paraQue = (t: T): Record<AccesoDelEquipo['rol'], string> => ({
  admin: t('Tienes acceso de administración: ventas, eventos, clientes, catálogo y ajustes.', 'You have admin access: sales, events, clients, catalog and settings.'),
  atelier: t('Desde tu panel llevas tus eventos: invitaciones, invitados y el día de la fiesta.', 'From your panel you run your events: invitations, guests and the party day.'),
  cliente: t('Desde tu panel sigues tu evento en cuanto te den acceso a él.', 'From your panel you follow your event as soon as you are given access to it.'),
  puerta: t('Desde tu panel registras el ingreso de los invitados.', 'From your panel you check guests in.'),
})

export function teamAccessEmail(input: AccesoDelEquipo): CorreoCompuesto {
  const t = traductor(input.locale ?? 'es')
  const aviso = t('Es una contraseña provisional: al entrar por primera vez te pediremos que elijas una tuya.', 'It is a temporary password: the first time you sign in we will ask you to choose your own.')
  const contacto = input.whatsapp === null ? '' : t(`\nDudas: ${input.whatsapp}`, `\nQuestions: ${input.whatsapp}`)
  const yaTienes = t('Ya tienes acceso al panel.', 'You now have access to the panel.')
  const usuario = t('Usuario', 'Username')
  const contrasena = t('Contraseña', 'Password')
  const buzon = t('Este buzón no atiende respuestas.', 'This mailbox does not take replies.')

  const text = [
    yaTienes,
    '',
    paraQue(t)[input.rol],
    '',
    t(`Entra en: ${input.panelUrl}`, `Sign in at: ${input.panelUrl}`),
    `${usuario}: ${input.email}`,
    `${contrasena}: ${input.password}`,
    '',
    aviso,
    '',
    buzon + contacto,
    '',
    firmaTexto(input.siteUrl),
  ].join('\n')

  const html = [
    `<p>${yaTienes}</p>`,
    `<p>${escapar(paraQue(t)[input.rol])}</p>`,
    `<p><a href="${escapar(input.panelUrl)}">${t('Entrar al panel', 'Open the panel')}</a></p>`,
    `<p>${usuario}: <strong>${escapar(input.email)}</strong><br>${contrasena}: <strong>${escapar(input.password)}</strong></p>`,
    `<p>${escapar(aviso)}</p>`,
    `<p>${buzon}${input.whatsapp === null ? '' : t(` Dudas: ${escapar(input.whatsapp)}`, ` Questions: ${escapar(input.whatsapp)}`)}</p>`,
    firmaHtml(input.siteUrl),
  ].join('')

  return { subject: t('Tu acceso al panel', 'Your panel access'), text, html }
}
