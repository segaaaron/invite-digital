import { AsYouType, getCountryCallingCode, isValidPhoneNumber, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'

/**
 * Los países donde se vende: Latinoamérica, Estados Unidos y Canadá.
 *
 * El prefijo no se escribe a mano en ninguna parte: se elige el país y el número se guarda
 * en formato internacional (E.164), que es lo único que entiende `wa.me`. La lista la ordena
 * el nombre, salvo Bolivia, que va primera por ser el mercado de casa.
 */
export const PAISES: ReadonlyArray<{ readonly code: CountryCode; readonly nombre: string; readonly bandera: string }> = [
  { code: 'BO', nombre: 'Bolivia', bandera: '🇧🇴' },
  { code: 'AR', nombre: 'Argentina', bandera: '🇦🇷' },
  { code: 'BR', nombre: 'Brasil', bandera: '🇧🇷' },
  { code: 'CA', nombre: 'Canadá', bandera: '🇨🇦' },
  { code: 'CL', nombre: 'Chile', bandera: '🇨🇱' },
  { code: 'CO', nombre: 'Colombia', bandera: '🇨🇴' },
  { code: 'CR', nombre: 'Costa Rica', bandera: '🇨🇷' },
  { code: 'CU', nombre: 'Cuba', bandera: '🇨🇺' },
  { code: 'DO', nombre: 'República Dominicana', bandera: '🇩🇴' },
  { code: 'EC', nombre: 'Ecuador', bandera: '🇪🇨' },
  { code: 'SV', nombre: 'El Salvador', bandera: '🇸🇻' },
  { code: 'ES', nombre: 'España', bandera: '🇪🇸' },
  { code: 'US', nombre: 'Estados Unidos', bandera: '🇺🇸' },
  { code: 'GT', nombre: 'Guatemala', bandera: '🇬🇹' },
  { code: 'HN', nombre: 'Honduras', bandera: '🇭🇳' },
  { code: 'MX', nombre: 'México', bandera: '🇲🇽' },
  { code: 'NI', nombre: 'Nicaragua', bandera: '🇳🇮' },
  { code: 'PA', nombre: 'Panamá', bandera: '🇵🇦' },
  { code: 'PY', nombre: 'Paraguay', bandera: '🇵🇾' },
  { code: 'PE', nombre: 'Perú', bandera: '🇵🇪' },
  { code: 'PR', nombre: 'Puerto Rico', bandera: '🇵🇷' },
  { code: 'UY', nombre: 'Uruguay', bandera: '🇺🇾' },
  { code: 'VE', nombre: 'Venezuela', bandera: '🇻🇪' },
]

/** Por defecto, Bolivia: es donde está el atelier y de donde son casi todos los invitados. */
export const PAIS_POR_DEFECTO: CountryCode = 'BO'

const CODIGOS = new Set(PAISES.map((p) => p.code))

/** El prefijo del país, ya con el `+`: `BO` → `+591`. */
export const prefijoDe = (code: CountryCode): string => `+${getCountryCallingCode(code)}`

/**
 * De qué país es un número ya guardado, para abrir el campo con su bandera puesta. Lo que no
 * se reconozca cae en el país por defecto y el número se queda tal cual.
 */
export function paisDeNumero(valor: string, porDefecto: CountryCode = PAIS_POR_DEFECTO): CountryCode {
  const numero = parsePhoneNumberFromString(valor.trim())
  return numero?.country !== undefined && CODIGOS.has(numero.country) ? numero.country : porDefecto
}

/** Lo que se escribe, sin el prefijo del país: es lo que se edita en el campo. */
export function nacionalDe(valor: string, code: CountryCode): string {
  const numero = parsePhoneNumberFromString(valor.trim())
  if (numero === undefined) return valor.replace(/^\+\d+\s*/, '').trim()
  return numero.country === code ? numero.nationalNumber : numero.formatNational()
}

/** Cómo se lee mientras se escribe: `70012345` → `700 12345`. */
export const formatearMientrasEscribe = (nacional: string, code: CountryCode): string =>
  new AsYouType(code).input(nacional)

/**
 * Lo que se guarda: E.164 (`+59170012345`), que es lo que `wa.me` exige y lo que permite
 * llamar desde cualquier país. Un número que no cuadra se devuelve como se escribió: perder
 * lo que alguien acaba de teclear es peor que guardar algo raro.
 */
export function aGuardar(nacional: string, code: CountryCode): string {
  const limpio = nacional.trim()
  if (limpio === '') return ''
  const numero = parsePhoneNumberFromString(limpio, code)
  return numero?.isValid() === true ? numero.number : `${prefijoDe(code)}${limpio.replace(/\D/g, '')}`
}

/** Si el número está completo para ese país. Sirve para avisar, nunca para bloquear. */
export const esValido = (nacional: string, code: CountryCode): boolean =>
  nacional.trim() === '' || isValidPhoneNumber(nacional, code)
