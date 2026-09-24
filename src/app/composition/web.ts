import { DEFAULT_SITE_SETTINGS, formatoWhatsapp } from '@/modules/admin/domain/site-settings'
import { cache } from 'react'
import { adminAlertEmail, clientAccessEmail, passwordResetEmail, rsvpHostEmail, supportAccessEmail } from '@/modules/notifications'
import { createResendSender } from '@/modules/notifications/infrastructure/resend-sender'
import { env } from '@/shared/config/env'
import { listCategories } from '@/modules/catalog/application/list-categories'
import { listPlans } from '@/modules/catalog/application/list-plans'
import { listTemplates } from '@/modules/catalog/application/list-templates'
import { drizzleCategoryRepository } from '@/modules/catalog/infrastructure/drizzle-category-repository'
import { drizzlePlanRepository } from '@/modules/catalog/infrastructure/drizzle-plan-repository'
import { drizzleTemplateRepository } from '@/modules/catalog/infrastructure/drizzle-template-repository'
import { submitConsultation } from '@/modules/leads/application/submit-consultation'
import { drizzleConsultationRepository } from '@/modules/leads/infrastructure/drizzle-consultation-repository'
import { anonymizeExpiredConsultations, countNewConsultations, listConsultations, moveConsultation } from '@/modules/leads/application/inbox-use-cases'
import { drizzleConsultationInbox } from '@/modules/leads/infrastructure/drizzle-consultation-inbox'
import { lecturaCacheada, ETIQUETAS_WEB } from '@/shared/cache/lectura-cacheada'
import { leerSitio } from './base'

export const catalog = {
  listPlans: listPlans({ plans: drizzlePlanRepository }),
  listTemplates: listTemplates({ templates: drizzleTemplateRepository }),
  listCategories: listCategories({ categories: drizzleCategoryRepository }),
} as const

export const leads = {
  submitConsultation: submitConsultation({ requests: drizzleConsultationRepository, clock: () => new Date() }),
  /** La bandeja del admin: lo que llega del formulario de la web. */
  list: listConsultations({ inbox: drizzleConsultationInbox }),
  countNew: countNewConsultations({ inbox: drizzleConsultationInbox }),
  move: moveConsultation({ inbox: drizzleConsultationInbox, clock: () => new Date() }),
  anonymizeExpired: anonymizeExpiredConsultations({ inbox: drizzleConsultationInbox, clock: () => new Date() }),
} as const

/**
 * El correo saliente.
 *
 * `sendClientAccess` compone y entrega de una vez: quien lo llama está dando de alta a un
 * cliente y no tiene por qué saber cómo se redacta. **Devuelve un booleano y no lanza**,
 * así que un fallo del proveedor no puede tumbar el alta — la cuenta ya está creada y la
 * contraseña se sigue enseñando en pantalla, que es como se repartía antes de haber correo.
 */
const sitioPublicoUrl = env.SITE_URL.replace(/\/+$/, '')

const emailSender = createResendSender({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM })

/**
 * «La web» para quien la pinta: una lectura **por petición** —el pie, la portada y el
 * marcado de Google la piden en la misma respuesta— y, si la base no responde, los valores
 * por defecto. Un fallo de ajustes no puede tumbar la web: se registra y se sigue.
 */
/**
 * «La web» se cachea **entre visitas** (etiqueta `web:ajustes`) y además una vez por petición.
 * Son datos públicos: la invalidan `saveSiteSettingsAction` y `restoreSiteVersionAction`.
 */
const leerSitioCacheado = lecturaCacheada(() => leerSitio(), { clave: 'ajustes', etiquetas: [ETIQUETAS_WEB.ajustes] })

export const site = {
  settings: cache(async () => {
    const leido = await leerSitioCacheado()
    if (!leido.ok) console.error('«La web» no se pudo leer; se usan los valores por defecto:', leido.error.detail)
    return leido.ok ? leido.value : DEFAULT_SITE_SETTINGS
  }),
}

export const notifications = {
  /** El código de recuperación. Sin enlace dentro: se teclea donde ya se pidió el cambio. */
  sendPasswordCode: async (input: { to: string; code: string }) =>
    emailSender.send({
      to: input.to,
      ...passwordResetEmail({
        code: input.code,
        minutos: 10,
        whatsapp: formatoWhatsapp((await site.settings()).whatsapp) || null,
        siteUrl: sitioPublicoUrl,
      }),
    }),
  sendClientAccess: async (input: { to: string; password: string | null; eventTitle: string }) =>
    emailSender.send({
      to: input.to,
      ...clientAccessEmail({
        email: input.to,
        password: input.password,
        eventTitle: input.eventTitle,
        panelUrl: `${sitioPublicoUrl}/panel/entrar`,
        siteUrl: sitioPublicoUrl,
        whatsapp: formatoWhatsapp((await site.settings()).whatsapp) || null,
      }),
    }),
  /** El aviso al cliente de que el equipo entró a su panel. Devuelve booleano y no lanza. */
  sendSupportAccess: async (input: { to: string; eventTitle: string; motivo: string; hora: string }) =>
    emailSender.send({
      to: input.to,
      ...supportAccessEmail({ ...input, siteUrl: sitioPublicoUrl, whatsapp: formatoWhatsapp((await site.settings()).whatsapp) || null }),
    }),
  /** Lo que le espera al admin. `ruta` es la del panel, sin dominio. Devuelve booleano y no lanza. */
  sendAdminAlert: (input: { to: string; asunto: string; lineas: readonly string[]; ruta: string }) =>
    emailSender.send({
      to: input.to,
      ...adminAlertEmail({ asunto: input.asunto, lineas: input.lineas, enlace: `${sitioPublicoUrl}${input.ruta}`, siteUrl: sitioPublicoUrl }),
    }),
  /** «Ana confirmó · 3 personas» a un anfitrión. `ruta` es la del panel. Devuelve booleano y no lanza. */
  sendRsvpToHost: (input: { to: string; invitado: string; asistentes: number; mensaje: string | null; evento: string; ruta: string }) =>
    emailSender.send({
      to: input.to,
      ...rsvpHostEmail({ ...input, enlace: `${sitioPublicoUrl}${input.ruta}`, siteUrl: sitioPublicoUrl }),
    }),
} as const
