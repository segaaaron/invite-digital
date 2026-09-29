/**
 * Arturo, el asistente del panel del evento (plan Alta Costura). Cada módulo se importa por este fichero.
 * Solo tipos y funciones puras: el modelo, el uso y las herramientas se componen en `app/composition/asistente`.
 */
export { CONFIG_POR_DEFECTO, MENSAJE_DE_CIERRE, leerConfig, mesEnBolivia, puedeConversar, validarConfig, type ConfigDelAsistente } from './domain/config'
export { esquemaDePropuesta, MAX_INVITACIONES_POR_PROPUESTA, type InvitacionPropuesta } from './domain/herramientas'
export { NOMBRE_DEL_ASISTENTE } from './domain/reglas'
export type { Salida } from './application/conversar'
