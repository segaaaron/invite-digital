'use client'

import { useActionState, useId } from 'react'
import { guardarMisDatosAction, type MisDatosState } from '@/app/_acciones/identity/actions'
import { FIELD_CLASS, Field } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'

const INICIAL: MisDatosState = { status: 'idle' }

/** «Tus datos» (E21): nombre y teléfono se cambian aquí; el correo, no —con él se entra—. */
export function MisDatos({ nombre, correo, telefono, ayudaCorreo }: { nombre: string | null; correo: string; telefono: string | null; ayudaCorreo: string }) {
  const t = useT()
  const [estado, guardar] = useActionState(sinCaerse(guardarMisDatosAction), INICIAL)
  const id = useId()
  return (
    <form action={guardar} className="flex flex-col gap-4">
      <Field htmlFor={`${id}-n`} label={t('Nombre', 'Name')}>
        <input autoComplete="name" className={FIELD_CLASS} defaultValue={nombre ?? ''} id={`${id}-n`} maxLength={120} name="nombre" />
      </Field>
      <Field hint={ayudaCorreo} htmlFor={`${id}-c`} label={t('Correo', 'Email')}>
        <input className={`${FIELD_CLASS} bg-bg-sunken text-ink-mute`} id={`${id}-c`} readOnly value={correo} />
      </Field>
      <Field htmlFor={`${id}-t`} label={t('Teléfono', 'Phone')}>
        <input autoComplete="tel" className={FIELD_CLASS} defaultValue={telefono ?? ''} id={`${id}-t`} inputMode="tel" maxLength={24} name="telefono" placeholder="+591 70000000" />
      </Field>
      <div className="flex items-center justify-end gap-3">
        <ActionFeedback state={estado} />
        <SubmitButton pendingLabel={t('Guardando…', 'Saving…')}>{t('Guardar', 'Save')}</SubmitButton>
      </div>
    </form>
  )
}
