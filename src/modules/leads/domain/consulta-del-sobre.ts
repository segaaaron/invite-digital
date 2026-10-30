import type { Locale } from '@/shared/i18n/locales'
import type { ConsultationInput } from './consultation'

/** Lo que el cliente escribió en el sobre de la portada, tal como lo nombra el formulario. */
export type CamposDelSobre = {
  readonly nombres: string
  readonly tel: string
  /** `AAAA-MM-DD`, tal cual lo da el `<input type="date">`. Vacío si no eligió. */
  readonly fecha: string
  /** El mensaje que se manda por WhatsApp: ya trae la fiesta, la fecha y el plan escritos. */
  readonly mensaje: string
  readonly locale: Locale
}

/**
 * **El sobre de la portada, como consulta.** El sobre abre WhatsApp, y eso es lo que el cliente
 * vino a hacer; pero la venta se trabaja en el panel, así que lo mismo que se manda se guarda.
 *
 * Aquí, puro y aparte, porque lo que se rompe en silencio es el nombre de los campos: una clave
 * mal escrita la rechaza el esquema con `invalid_payload`, el cliente ve su chat abrirse igual y
 * la consulta no aparece en Ventas. Su prueba lo sujeta.
 *
 * Sin correo —el sobre no lo pide— y sin categoría: la fiesta va dentro del mensaje, que es donde
 * la escribió el cliente.
 */
export function consultaDelSobre(campos: CamposDelSobre): ConsultationInput {
  return {
    name: campos.nombres,
    email: '',
    phone: campos.tel,
    categorySlug: '',
    eventDate: campos.fecha,
    message: campos.mensaje,
    locale: campos.locale,
  }
}
