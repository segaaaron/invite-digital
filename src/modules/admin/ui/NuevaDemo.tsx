'use client'

import { useActionState, useId } from 'react'
import { crearDemoAction, type DemoActionState } from '@/app/_acciones/admin/demos-actions'
import { CATALOG_LISTOS, nombreDelCatalogo, seAsigna } from '@/shared/design/theme-catalog'
import { Field, FIELD_CLASS, PanelAlert } from '@/shared/design/ui/panel/PanelKit'
import { SubmitButton } from '@/shared/design/ui/panel/SubmitButton'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * **Armar una demo**: el diseño que al cliente le llamó la atención, a nombre de quién va, y listo.
 *
 * Al crearla **se entra derecho a escribirla**: nombres, fotos y música, en el editor de siempre. El
 * enlace para mandarla espera en su fila de Demos, con WhatsApp y correo, para cuando ya haya algo que
 * enseñar.
 */
export function NuevaDemo() {
  const t = useT()
  const id = useId()
  const [estado, enviar] = useActionState<DemoActionState, FormData>(crearDemoAction, { status: 'idle' })


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
        {t(
          'Al crearla entras a escribirla: nombres, fotos y música. La demo abre durante 24 horas y después se borra sola.',
          'Creating it takes you straight to writing it: names, photos and music. The demo opens for 24 hours and then deletes itself.',
        )}
      </p>

      <SubmitButton>{t('Crear la demo', 'Create the demo')}</SubmitButton>
    </form>
  )
}
