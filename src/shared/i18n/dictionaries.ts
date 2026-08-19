import { en } from './messages/en'
import { es } from './messages/es'
import type { Dictionary } from './dictionary'
import type { Locale } from './locales'

const DICTIONARIES: Record<Locale, Dictionary> = { en, es }

export const getDictionary = (locale: Locale): Dictionary => DICTIONARIES[locale]
export type { Dictionary }
