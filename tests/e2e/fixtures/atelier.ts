import { resolve } from 'node:path'

// Credenciales de la base de desarrollo; se dan de alta con `pnpm user:create`.
export const ATELIER = { email: 'atelier@invitepremium.bo', password: 'contrasena-de-prueba-1' } as const

export const AUTH_STATE = resolve(process.cwd(), 'tests/e2e/.auth/atelier.json')

/**
 * El administrador **de las pruebas**, con su propio usuario.
 *
 * Existe porque la suite daba por hecho que `atelier@` era admin, y eso ató las pruebas a
 * cómo estén repartidos los roles en la base de desarrollo: el día que alguien le quita el
 * rol —que es exactamente lo que pasó— la suite se cae por un cambio de datos, no de
 * código. La prueba se trae el suyo.
 */
export const ADMIN = { email: 'admin-e2e@invitepremium.bo', password: 'contrasena-del-admin-1' } as const

export const ADMIN_AUTH_STATE = resolve(process.cwd(), 'tests/e2e/.auth/admin.json')
