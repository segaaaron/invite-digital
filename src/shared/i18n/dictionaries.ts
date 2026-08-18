import { en } from './messages/en'
import { es, type Dictionary } from './messages/es'
import type { Locale } from './locales'

const DICTIONARIES: Record<Locale, Dictionary> = { en, es }

export const getDictionary = (locale: Locale): Dictionary => DICTIONARIES[locale]
export type { Dictionary }
