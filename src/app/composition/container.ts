// Raíz de composición: el único lugar donde se conectan los puertos de `application`
// con sus implementaciones de `infrastructure`. Vive en `src/app` (no en `src/shared`)
// porque la configuración de fronteras de ESLint (`eslint.config.mjs`) solo permite que
// el tipo `app` importe de `infrastructure`; `shared` solo puede importar de `shared`.
// Ver el informe de la Task 7 para el detalle de esta decisión.
import { createEventUseCase } from '@/modules/events/application/create-event'
import { getEventById, getEventBySlug } from '@/modules/events/application/get-event'
import { listEvents } from '@/modules/events/application/list-events'
import { updateEventUseCase } from '@/modules/events/application/update-event'
import { drizzleEventRepository } from '@/modules/events/infrastructure/drizzle-event-repository'
import { addGuestGroup } from '@/modules/guests/application/add-guest-group'
import { listGuestGroups } from '@/modules/guests/application/list-guest-groups'
import { resolveByToken } from '@/modules/guests/application/resolve-by-token'
import { revokeInvitation } from '@/modules/guests/application/revoke-invitation'
import { drizzleGuestGroupRepository } from '@/modules/guests/infrastructure/drizzle-guest-group-repository'
import { authenticateSession } from '@/modules/identity/application/authenticate-session'
import { signIn } from '@/modules/identity/application/sign-in'
import { signOut } from '@/modules/identity/application/sign-out'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'
import { drizzleSessionRepository } from '@/modules/identity/infrastructure/drizzle-session-repository'
import { drizzleUserRepository } from '@/modules/identity/infrastructure/drizzle-user-repository'
import { createTokenMinter } from '@/shared/security/tokens'
import { getTemplate } from '@/modules/catalog/application/get-template'
import { listCategories } from '@/modules/catalog/application/list-categories'
import { listPlans } from '@/modules/catalog/application/list-plans'
import { listTemplates } from '@/modules/catalog/application/list-templates'
import { drizzleCategoryRepository } from '@/modules/catalog/infrastructure/drizzle-category-repository'
import { drizzlePlanRepository } from '@/modules/catalog/infrastructure/drizzle-plan-repository'
import { drizzleTemplateRepository } from '@/modules/catalog/infrastructure/drizzle-template-repository'
import { submitConsultation } from '@/modules/leads/application/submit-consultation'
import { drizzleConsultationRepository } from '@/modules/leads/infrastructure/drizzle-consultation-repository'

export const catalog = {
  listPlans: listPlans({ plans: drizzlePlanRepository }),
  listTemplates: listTemplates({ templates: drizzleTemplateRepository }),
  getTemplate: getTemplate({ templates: drizzleTemplateRepository }),
  listCategories: listCategories({ categories: drizzleCategoryRepository }),
} as const

export const leads = {
  submitConsultation: submitConsultation({ requests: drizzleConsultationRepository, clock: () => new Date() }),
} as const

// Un solo acuñador para todo el proceso: no guarda estado, solo aleatoriedad del
// sistema y SHA-256.
const minter = createTokenMinter()
const clock = () => new Date()

export const identity = {
  signIn: signIn({ users: drizzleUserRepository, sessions: drizzleSessionRepository, hasher: argon2Hasher, minter, clock }),
  signOut: signOut({ sessions: drizzleSessionRepository, minter }),
  authenticateSession: authenticateSession({ sessions: drizzleSessionRepository, minter, clock }),
} as const

export const events = {
  create: createEventUseCase({ events: drizzleEventRepository, ids: () => crypto.randomUUID() }),
  update: updateEventUseCase({ events: drizzleEventRepository }),
  list: listEvents({ events: drizzleEventRepository }),
  getBySlug: getEventBySlug({ events: drizzleEventRepository }),
  getById: getEventById({ events: drizzleEventRepository }),
} as const

export const guests = {
  add: addGuestGroup({ groups: drizzleGuestGroupRepository, minter, ids: () => crypto.randomUUID() }),
  list: listGuestGroups({ groups: drizzleGuestGroupRepository }),
  revoke: revokeInvitation({ groups: drizzleGuestGroupRepository, clock }),
  resolveByToken: resolveByToken({ groups: drizzleGuestGroupRepository, minter, clock }),
} as const
