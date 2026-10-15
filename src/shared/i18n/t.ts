import type { Locale } from './locales'

/**
 * Un texto en los dos idiomas, escrito donde se usa: `t('Guardar', 'Save')` (14 oct).
 *
 * El panel tenía más de dos mil textos a mano en español. Con una clave de diccionario por cada uno, cada texto
 * vivía en tres ficheros y nadie leía la pantalla sin saltar entre ellos; así se lee igual y **no compila sin
 * los dos idiomas**, que es lo que de verdad pedía la regla del diccionario. La web y las invitaciones siguen con
 * su diccionario (`dictionary.ts`), que traducen los bloques largos.
 */
export type T = (es: string, en: string) => string

export const traductor =
  (locale: Locale): T =>
  (es, en) =>
    locale === 'es' ? es : en

/** El formato de fechas y cifras de cada idioma (`Intl`). */
export const INTL: Record<Locale, string> = { es: 'es-BO', en: 'en-US' }
