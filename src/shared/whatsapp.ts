/**
 * WhatsApp en un solo sitio: normalizar, formatear y enlazar.
 *
 * Lo usan «La web» del admin, el formulario de contacto, los precios, la ayuda y la bandeja
 * de consultas. Estuvo copiado en tres ficheros con la regla del 591 en cada uno: el día
 * que cambiara, cambiaría en uno.
 */

/**
 * `wa.me` exige el número internacional sin signos. Un celular boliviano escrito sin
 * prefijo —ocho dígitos que empiezan por 6 o 7— se completa con 591, que es como lo
 * escribe casi cualquiera aquí. `null` si no es un número; vacío si no hay.
 */
export function normalizarWhatsapp(crudo: string): string | null {
  const digitos = crudo.replace(/\D/g, '')
  if (digitos === '') return ''
  const completo = /^[67]\d{7}$/.test(digitos) ? `591${digitos}` : digitos
  return completo.length >= 8 && completo.length <= 15 ? `+${completo}` : null
}

/** `+59170012345` → `+591 700 12345`. Para leer; el enlace usa los dígitos. */
export function formatoWhatsapp(numero: string): string {
  const digitos = numero.replace(/\D/g, '')
  if (digitos === '') return ''
  if (digitos.startsWith('591') && digitos.length === 11) return `+591 ${digitos.slice(3, 6)} ${digitos.slice(6)}`
  return `+${digitos}`
}

/** El enlace `wa.me`, con el mensaje codificado. `null` si no hay número que enlazar. */
export function enlaceWhatsapp(numero: string | null, mensaje: string): string | null {
  if (numero === null) return null
  const normalizado = normalizarWhatsapp(numero)
  if (normalizado === null || normalizado === '') return null
  const digitos = normalizado.slice(1)
  return `https://wa.me/${digitos}${mensaje.trim() === '' ? '' : `?text=${encodeURIComponent(mensaje)}`}`
}
