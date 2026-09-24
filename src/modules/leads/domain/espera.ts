/** A partir de aquí, una consulta sin contestar ya es tarde: se marca. */
export const HORAS_DE_URGENCIA = 24

/**
 * Cuánto lleva esperando una consulta nueva, dicho como se dice («hace 3 h», «hace 2 días»),
 * y si ya pasó del día. Recibe el reloj como argumento, como todo lo que cuenta tiempo aquí.
 */
export function esperaDeConsulta(recibida: Date, ahora: Date): { readonly texto: string; readonly urgente: boolean } {
  const minutos = Math.max(0, Math.floor((ahora.getTime() - recibida.getTime()) / 60_000))
  const horas = Math.floor(minutos / 60)
  const dias = Math.floor(horas / 24)
  const texto =
    minutos < 1 ? 'recién llegada' : minutos < 60 ? `hace ${minutos} min` : horas < 24 ? `hace ${horas} h` : `hace ${dias} día${dias === 1 ? '' : 's'}`
  return { texto, urgente: horas >= HORAS_DE_URGENCIA }
}
