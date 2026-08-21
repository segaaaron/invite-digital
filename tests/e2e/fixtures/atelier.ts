import { resolve } from 'node:path'

// Credenciales de la base de desarrollo; se dan de alta con `pnpm user:create`.
export const ATELIER = { email: 'atelier@invitepremium.bo', password: 'contrasena-de-prueba-1' } as const

export const AUTH_STATE = resolve(process.cwd(), 'tests/e2e/.auth/atelier.json')
