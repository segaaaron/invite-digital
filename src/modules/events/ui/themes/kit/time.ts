export type CountdownParts = {
  readonly days: number
  readonly hours: number
  readonly mins: number
  readonly secs: number
  /** La fecha ya pasó, o no se pudo leer. El diseño decide si esconde la cuenta o la deja a cero. */
  readonly over: boolean
}

const CERO: CountdownParts = { days: 0, hours: 0, mins: 0, secs: 0, over: true }

/** Dos cifras, que es como las pintan los dieciséis diseños. */
export const pad = (n: number, ancho = 2): string => String(n).padStart(ancho, '0')

/**
 * El tiempo que falta, **recibiendo el instante como argumento**.
 *
 * No llama al reloj a propósito, igual que `dueReminders` recibe el día y `autoAssign` no
 * llama a `Math.random`: así la víspera del evento se prueba sin tocar el reloj del
 * sistema. Quien anima es `<Countdown>`, que es el que sí lo mira.
 *
 * Nunca devuelve cifras negativas. Una invitación que dice «faltan -3 días» está rota a la
 * vista de todo el que la abra después de la boda, que son muchos: la gente vuelve al
 * enlace para consultar la hora, la dirección o la mesa durante semanas.
 */
export function countdownFrom(targetISO: string, now: Date): CountdownParts {
  const objetivo = new Date(targetISO).getTime()
  if (Number.isNaN(objetivo)) return CERO

  const restante = objetivo - now.getTime()
  if (restante <= 0) return CERO

  const total = Math.floor(restante / 1000)
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    mins: Math.floor((total % 3_600) / 60),
    secs: total % 60,
    over: false,
  }
}
