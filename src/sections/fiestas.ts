import { fiestaDeCategoria } from '@/modules/events'
import type { Fiesta } from '@/shared/i18n/dictionary'
import type { Locale } from '@/shared/i18n/locales'
import { rutaDe } from '@/shared/i18n/rutas'

/**
 * **A dónde lleva cada celebración.** El documento de correcciones (30 oct) pide que las postales
 * y la columna del pie lleven a los diseños de su fiesta, no todas al mismo sitio.
 *
 * Bodas y XV tienen su propia página; los cumpleaños **todavía no**, así que van al anillo de
 * diseños de la portada, donde su filtro existe. En cuanto haya página de cumpleaños, se cambia aquí.
 */
export const enlaceDeFiesta = (locale: Locale, fiesta: Fiesta): string =>
  fiesta === 'boda' ? rutaDe(locale, 'bodas') : fiesta === 'xv' ? rutaDe(locale, 'xv-anos') : `/${locale}#disenos`

/**
 * La fiesta de un modelo del catálogo **la decide el dominio**, no la portada: la misma función
 * reparte los modelos en `/bodas` y en `/xv-anos` (`plantillasDeFiesta`). Escrita dos veces, un día
 * una de las dos manda un diseño a la celebración equivocada.
 */
export { fiestaDeCategoria }
