'use client'

import { useActionState, useId } from 'react'
import { crearDemoAction, type DemoActionState } from '@/app/_acciones/admin/demos-actions'
import { CATALOG_LISTOS, nombreDelCatalogo, seAsigna } from '@/shared/design/theme-catalog'
import { CopyLinkButton } from '@/shared/design/ui/CopyLinkButton'
import { Field, FIELD_CLASS, PanelAlert, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { SubmitButton } from '@/shared/design/ui/panel/SubmitButton'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * **Armar una demo**: el diseño que al cliente le llamó la atención, a nombre de quién va, y listo.
 *
 * Nace con el contenido de muestra del propio diseño, así que ya se puede mandar tal cual; si el admin
 * quiere cambiarle los nombres, la fecha, las fotos o la música, entra al editor de siempre con
 * «Editarla», que es la misma pantalla de cualquier evento.
 */
export function NuevaDemo() {
  const t = useT()
  const id = useId()
  const [estado, enviar] = useActionState<DemoActionState, FormData>(crearDemoAction, { status: 'idle' })

  if (estado.status === 'success' && estado.url !== undefined) {
    // El mensaje ya escrito: el admin solo elige a quién. Dice lo del día dentro del propio WhatsApp,
    // que es donde el cliente lo va a leer.
    const mensaje = t(
      `Mira cómo quedaría tu invitación: ${estado.url}\n\nEs una demostración y solo abre durante un día.`,
      `See how your invitation would look: ${estado.url}\n\nIt’s a demo and it only opens for one day.`,
    )
    return (
      <div className="flex flex-col gap-5">
        {/* El aviso que el usuario pidió: el admin tiene que poder decírselo al cliente al pasarle el enlace. */}
        <PanelAlert tone="info">{estado.message}</PanelAlert>
        <CopyLinkButton label={t('Enlace de la demo', 'Demo link')} url={estado.url} />
        <div className="flex flex-wrap gap-2">
          <PanelButton external href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}>
            {t('Mandar por WhatsApp', 'Send on WhatsApp')}
          </PanelButton>
          {/* Por correo, desde el tuyo: `mailto:`, como el reparto de invitados. El remitente del sistema
              solo manda credenciales, recuperación y códigos; una demo no va por ahí. */}
          <PanelButton external href={`mailto:?subject=${encodeURIComponent(t('Mira cómo quedaría tu invitación', 'See how your invitation would look'))}&body=${encodeURIComponent(mensaje)}`}>
            {t('Mandar por correo', 'Send by email')}
          </PanelButton>
          {/* Primero escribirla: la demo nace con la muestra del diseño, y lo que se le enseña al cliente son
              sus nombres y su música. El enlace de arriba ya está copiado si lo quiere mandar tal cual. */}
          {estado.slug === undefined ? null : (
            <PanelButton href={`/panel/eventos/${estado.slug}/configuracion?vista=invitacion`} variant="primary">
              {t('Escribir la invitación', 'Write the invitation')}
            </PanelButton>
          )}
        </div>
      </div>
    )
  }

  return (
    <form action={enviar} className="flex flex-col gap-5">
      {estado.status === 'error' ? <PanelAlert tone="error">{estado.message}</PanelAlert> : null}

      <Field hint={t('El que le llamó la atención. Después se puede cambiar.', 'The one that caught their eye. It can be changed later.')} label={t('Diseño', 'Design')} htmlFor={`${id}-tema`}>
        <select className={FIELD_CLASS} id={`${id}-tema`} name="themeKey" required>
          {/* `seAsigna`, la misma regla que la acción: con `CATALOG_LISTOS` a secas salían los cinco
              diseños retirados y elegir uno acababa en «ese diseño no está a la venta». */}
          {CATALOG_LISTOS.filter((entrada) => seAsigna(entrada.key)).map((entrada) => (
            <option key={entrada.key} value={entrada.key}>
              {nombreDelCatalogo(entrada.key, 'es') ?? entrada.es}
            </option>
          ))}
        </select>
      </Field>

      <Field hint={t('Los nombres que se leen en la invitación.', 'The names shown on the invitation.')} label={t('Nombre de la fiesta', 'Party name')} htmlFor={`${id}-titulo`}>
        <input className={FIELD_CLASS} maxLength={160} id={`${id}-titulo`} name="titulo" placeholder={t('XV de Valentina', 'Valentina’s 15th')} required type="text" />
      </Field>

      <Field hint={t('Como si fuera un invitado suyo: así la recibe tal cual la recibirían ellos.', 'As if they were one of their guests: that’s how they’ll receive it.')} label={t('A nombre de', 'Addressed to')} htmlFor={`${id}-para`}>
        <input className={FIELD_CLASS} maxLength={120} id={`${id}-para`} name="para" placeholder={t('Familia Rojas', 'The Rojas family')} required type="text" />
      </Field>

      <Field htmlFor={`${id}-locale`} label={t('Idioma', 'Language')}>
        <select className={FIELD_CLASS} defaultValue="es" id={`${id}-locale`} name="locale">
          <option value="es">{t('Español', 'Spanish')}</option>
          <option value="en">{t('Inglés', 'English')}</option>
        </select>
      </Field>

      <p className="text-[13px] text-ink-mute">
        {t('La demo abre durante 24 horas y después se borra sola, con todo lo que el cliente haya escrito.', 'The demo opens for 24 hours and then deletes itself, along with anything the client wrote.')}
      </p>

      <SubmitButton>{t('Crear la demo', 'Create the demo')}</SubmitButton>
    </form>
  )
}
