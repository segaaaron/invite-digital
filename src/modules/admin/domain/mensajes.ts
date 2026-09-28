/**
 * **Los mensajes que el admin manda a sus clientes, en un solo sitio** (Ajustes › Mensajes y
 * agenda). Se escribían a mano en cada WhatsApp —«Hola, te escribimos de…»— y cada uno salía
 * distinto. Aquí vive la plantilla y la pantalla la rellena al abrir WhatsApp.
 *
 * Variables: `{nombre}`, `{importe}`, `{enlace}`, `{fecha}`, `{plan}`, `{marca}`. Una variable que
 * el mensaje no tiene a mano se quita, no se deja escrita con sus llaves.
 */
export const MENSAJES = [
  {
    clave: 'contacto',
    titulo: 'Primera respuesta',
    ayuda: 'Al contestar una consulta nueva.',
    porDefecto: 'Hola {nombre}, gracias por escribir a {marca}. Vi que estás preparando tu evento del {fecha}: te cuento cómo trabajamos y te muestro los diseños que mejor le van.',
  },
  {
    clave: 'cotizacion',
    titulo: 'Cotización',
    ayuda: 'Al enviar el enlace de la cotización.',
    porDefecto: 'Hola {nombre}, aquí tienes tu cotización del plan {plan} por {importe}. En este enlace ves el detalle, los datos para pagar y subes tu comprobante: {enlace}',
  },
  {
    clave: 'recordatorio',
    titulo: 'Recordatorio de pago',
    ayuda: 'Cuando un pedido lleva días sin comprobante.',
    porDefecto: 'Hola {nombre}, ¿cómo vas? Te recuerdo que tu reserva queda confirmada al transferir {importe}. En este enlace están los datos y subes el comprobante: {enlace}',
  },
  {
    clave: 'aprobado',
    titulo: 'Pago aprobado',
    ayuda: 'Al aprobar un pago y crear el evento.',
    porDefecto: '¡Listo, {nombre}! Confirmamos tu pago. Ya tienes tu acceso al panel para escribir tu invitación; cualquier duda, aquí estoy.',
  },
  {
    clave: 'invitacion',
    titulo: 'Falta escribir la invitación',
    ayuda: 'Cuando el evento se acerca y la invitación sigue vacía.',
    porDefecto: 'Hola {nombre}, tu evento del {fecha} se acerca y tu invitación todavía no está escrita. ¿Te ayudo a terminarla esta semana?',
  },
  {
    clave: 'gracias',
    titulo: 'Gracias tras el evento',
    ayuda: 'Unos días después de la fiesta.',
    porDefecto: '¡Gracias por confiar en {marca}, {nombre}! Esperamos que la fiesta haya sido perfecta. Si nos regalas tu opinión, nos ayuda muchísimo.',
  },
] as const

export type ClaveDeMensaje = (typeof MENSAJES)[number]['clave']
export type Mensajes = Readonly<Record<ClaveDeMensaje, string>>

export const MENSAJES_POR_DEFECTO: Mensajes = Object.fromEntries(MENSAJES.map((m) => [m.clave, m.porDefecto])) as Mensajes

/** Cuántos eventos se atienden bien en un mismo día. Por encima, el calendario y la cotización avisan. */
export const CAPACIDAD_POR_DEFECTO = 3
export const CLAVE_CAPACIDAD = 'agenda.capacidad'
/** El descuento que recibe quien compra con un código de recomendación, en porcentaje. */
export const DESCUENTO_POR_DEFECTO = 10
export const CLAVE_DESCUENTO = 'referidos.descuento'
export const claveDeMensaje = (clave: ClaveDeMensaje) => `mensajes.${clave}`

const MAX_MENSAJE = 1000

/** Lo guardado, con lo que falte o esté vacío puesto por defecto. */
export function leerMensajes(filas: Readonly<Record<string, string>>): { mensajes: Mensajes; capacidad: number; descuentoReferido: number } {
  const mensajes = Object.fromEntries(
    MENSAJES.map((m) => {
      const guardado = filas[claveDeMensaje(m.clave)]?.trim() ?? ''
      return [m.clave, guardado === '' ? m.porDefecto : guardado]
    }),
  ) as Mensajes
  const capacidad = Number(filas[CLAVE_CAPACIDAD])
  const descuento = filas[CLAVE_DESCUENTO] === undefined ? DESCUENTO_POR_DEFECTO : Number(filas[CLAVE_DESCUENTO])
  return {
    mensajes,
    capacidad: Number.isInteger(capacidad) && capacidad > 0 ? capacidad : CAPACIDAD_POR_DEFECTO,
    descuentoReferido: Number.isInteger(descuento) && descuento >= 0 && descuento <= 50 ? descuento : DESCUENTO_POR_DEFECTO,
  }
}

/** Lo que se escribe: el texto recortado y la capacidad entre 1 y 20. Vacío vuelve al de por defecto. */
export function paraGuardar(input: Partial<Record<ClaveDeMensaje, string>>, capacidad: number, descuentoReferido = DESCUENTO_POR_DEFECTO): Record<string, string> {
  const filas: Record<string, string> = {}
  for (const m of MENSAJES) filas[claveDeMensaje(m.clave)] = (input[m.clave] ?? '').trim().slice(0, MAX_MENSAJE)
  filas[CLAVE_CAPACIDAD] = String(Math.min(20, Math.max(1, Math.round(Number.isFinite(capacidad) ? capacidad : CAPACIDAD_POR_DEFECTO))))
  filas[CLAVE_DESCUENTO] = String(Math.min(50, Math.max(0, Math.round(Number.isFinite(descuentoReferido) ? descuentoReferido : DESCUENTO_POR_DEFECTO))))
  return filas
}

export type VariablesDeMensaje = Partial<Record<'nombre' | 'importe' | 'enlace' | 'fecha' | 'plan' | 'marca', string | null>>

/**
 * Rellena la plantilla. Lo que no se sabe se quita con su espacio o su preposición colgante
 * («de tu evento del {fecha}» sin fecha queda «de tu evento»), y nunca sale una llave.
 */
export function rellenar(plantilla: string, vars: VariablesDeMensaje): string {
  return plantilla
    .replace(/\s*(?:del|de|el|por|para)?\s*\{(\w+)\}/g, (entero, nombre: string) => {
      const valor = vars[nombre as keyof VariablesDeMensaje]
      if (valor === undefined || valor === null || valor.trim() === '') return ''
      return entero.replace(`{${nombre}}`, valor.trim())
    })
    .replace(/\s+([,.:;!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
