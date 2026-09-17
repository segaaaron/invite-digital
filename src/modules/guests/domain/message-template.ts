/**
 * El mensaje por defecto: cordial, con el día y de tú o de ustedes según el cupo. Era una línea
 * seca —«Aquí está su invitación: …»— y el usuario pidió algo más cálido.
 */
function porDefecto(locale: string, varios: boolean, fecha: string | null): string {
  if (locale === 'en') {
    const dia = fecha === null ? '' : `: ${fecha}`
    return `Hello {nombre} ✨\n\nWe are so happy to share a very special day with ${varios ? 'you all' : 'you'}${dia}. Your presence will make it even more beautiful.\n\nHere is your invitation, with all the details and to confirm your attendance 💌\n{enlace}\n\nWe look forward to seeing you!`
  }
  const dia = fecha === null ? '' : `: el ${fecha}`
  return varios
    ? `Hola {nombre} ✨\n\nCon mucha alegría queremos compartir con ustedes un día muy especial${dia}. Su presencia lo hará aún más bonito.\n\nAquí está su invitación, con todos los detalles y para confirmar su asistencia 💌\n{enlace}\n\n¡Los esperamos con mucho cariño!`
    : `Hola {nombre} ✨\n\nCon mucha alegría queremos compartir contigo un día muy especial${dia}. Tu presencia lo hará aún más bonito.\n\nAquí está tu invitación, con todos los detalles y para confirmar tu asistencia 💌\n{enlace}\n\n¡Te esperamos con mucho cariño!`
}

/**
 * Compone el mensaje de reparto.
 *
 * El enlace **no** se guarda dentro de la plantilla: se pega aquí, al abrir WhatsApp. Una
 * plantilla con un enlace dentro sería un enlace en claro guardado en la base, que es
 * justo lo que el proyecto no hace en ninguna parte.
 */
export function renderMessage(input: {
  template: string | null
  locale: string
  groupLabel: string
  url: string
  /** Cupos de la invitación: con más de uno se habla de ustedes. */
  seats?: number
  /** El día, ya legible: «sábado, 17 de octubre». */
  fecha?: string | null
  /** El nombre del evento, para `{evento}` en una plantilla propia. */
  evento?: string
}): string {
  const fecha = input.fecha ?? null
  const plantilla = input.template?.trim() || porDefecto(input.locale, (input.seats ?? 1) > 1, fecha)
  // `{grupo}` es el nombre antiguo de `{nombre}`: las plantillas ya guardadas lo llevan.
  return plantilla
    .replaceAll('{nombre}', input.groupLabel)
    .replaceAll('{grupo}', input.groupLabel)
    .replaceAll('{evento}', input.evento ?? '')
    .replaceAll('{fecha}', fecha ?? '')
    .replaceAll('{enlace}', input.url)
}

/** El enlace de WhatsApp. Sin teléfono abre el selector de contacto. */
export function whatsappLink(input: { phone: string | null; message: string }): string {
  const texto = encodeURIComponent(input.message)
  // wa.me no admite el signo, ni espacios, ni guiones.
  const numero = input.phone?.replace(/[^0-9]/g, '') ?? ''
  return numero === '' ? `https://wa.me/?text=${texto}` : `https://wa.me/${numero}?text=${texto}`
}
