import { readSiteSettings } from '@/modules/admin/application/site-settings-use-cases'
import { drizzleSettingsRepository } from '@/modules/admin/infrastructure/drizzle-settings-repository'
import { createTokenMinter } from '@/shared/security/tokens'

// Un solo acuñador para todo el proceso: no guarda estado, solo aleatoriedad del
// sistema y SHA-256.
export const minter = createTokenMinter()

export const clock = () => new Date()

export const leerSitio = readSiteSettings({ settings: drizzleSettingsRepository })
