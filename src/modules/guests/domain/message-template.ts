/** La plantilla por defecto, por idioma del evento. */
const POR_DEFECTO: Record<string, string> = {
  es: 'Hola {nombre}: nos encantaría celebrar con ustedes. Aquí está su invitación: {enlace}',
  en: 'Hello {nombre}: we would love to celebrate with you. Here is your invitation: {enlace}',
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
}): string {
  const plantilla = input.template?.trim() || POR_DEFECTO[input.locale] || POR_DEFECTO.es!
  // `{grupo}` es el nombre antiguo de `{nombre}`: las plantillas ya guardadas lo llevan.
  return plantilla
    .replaceAll('{nombre}', input.groupLabel)
    .replaceAll('{grupo}', input.groupLabel)
    .replaceAll('{enlace}', input.url)
}

/** El enlace de WhatsApp. Sin teléfono abre el selector de contacto. */
export function whatsappLink(input: { phone: string | null; message: string }): string {
  const texto = encodeURIComponent(input.message)
  // wa.me no admite el signo, ni espacios, ni guiones.
  const numero = input.phone?.replace(/[^0-9]/g, '') ?? ''
  return numero === '' ? `https://wa.me/?text=${texto}` : `https://wa.me/${numero}?text=${texto}`
}
