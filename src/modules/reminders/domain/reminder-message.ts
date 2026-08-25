import type { ReminderKind } from './due'

/**
 * El texto del recordatorio, por motivo y por idioma del evento.
 *
 * **Nunca lleva el enlace dentro, y no es un olvido.** De cada token la base guarda solo
 * su SHA-256: reproducirlo es imposible, y regenerarlo invalidaría el que el invitado ya
 * tiene en la mano —justo lo que no se quiere hacer al recordarle algo—. El mensaje se
 * manda por el mismo chat de WhatsApp donde está la invitación, unas líneas más arriba,
 * y a eso apunta. Cuando el enlace se perdió de verdad, la salida es reenviar desde
 * «Enviar invitaciones», que avisa de que rota el enlace.
 */
const TEXTOS: Record<ReminderKind, Record<string, string>> = {
  sin_respuesta: {
    es: 'Hola {grupo}: les recordamos confirmar su asistencia antes del {fecha}. Pueden hacerlo desde la invitación que les enviamos por aquí. ¡Gracias!',
    en: 'Hello {grupo}: a gentle reminder to confirm your attendance before {fecha}. You can do it from the invitation we sent you here. Thank you!',
  },
  sin_abrir: {
    es: 'Hola {grupo}: les enviamos su invitación por aquí hace unos días y no sabemos si les llegó. ¿Nos confirman que pueden abrirla? El plazo cierra el {fecha}.',
    en: 'Hello {grupo}: we sent your invitation here a few days ago and we are not sure it arrived. Could you confirm you can open it? The deadline is {fecha}.',
  },
}

const FECHA: Record<string, string> = { es: 'es-BO', en: 'en-GB' }

export function reminderMessage(input: {
  kind: ReminderKind
  locale: string
  groupLabel: string
  deadline: Date
}): string {
  const porIdioma = TEXTOS[input.kind]
  const plantilla = porIdioma[input.locale] ?? porIdioma.es!
  const fecha = new Intl.DateTimeFormat(FECHA[input.locale] ?? FECHA.es, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(input.deadline)

  return plantilla.replaceAll('{grupo}', input.groupLabel).replaceAll('{fecha}', fecha)
}
