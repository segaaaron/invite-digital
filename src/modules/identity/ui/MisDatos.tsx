'use client'

import { useActionState, useId, useState, useTransition } from 'react'
import { cambiarCorreoAction, guardarMisDatosAction, requestAccountCodeAction, type CodigoDeCuentaState, type MisDatosState } from '@/app/_acciones/identity/actions'
import { FIELD_CLASS, Field } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'

const INICIAL: MisDatosState = { status: 'idle' }
const INICIAL_CORREO: CodigoDeCuentaState = { status: 'idle', message: '' }

/** «Tus datos» (E21): nombre y teléfono se guardan aquí; el correo se cambia aparte, con el código de su correo actual. */
export function MisDatos({ nombre, correo, telefono, ayudaCorreo, cambiaCorreo = true }: { nombre: string | null; correo: string; telefono: string | null; ayudaCorreo: string; cambiaCorreo?: boolean }) {
  const t = useT()
  const [estado, guardar] = useActionState(sinCaerse(guardarMisDatosAction), INICIAL)
  const id = useId()
  return (
    <>
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
    {cambiaCorreo ? <CambiarCorreo correo={correo} /> : null}
    </>
  )
}

/**
 * Cambiar el correo (16 oct): se pide un código al correo **actual** (lo único que distingue al dueño cuando la
 * contraseña se comparte), se escribe el nuevo con el código, y listo. Antes había que crear otra cuenta.
 */
function CambiarCorreo({ correo }: { correo: string }) {
  const t = useT()
  const id = useId()
  const [pedido, setPedido] = useState<CodigoDeCuentaState>(INICIAL_CORREO)
  const [pidiendo, pedir] = useTransition()
  const [estado, cambiar] = useActionState(sinCaerse(cambiarCorreoAction), INICIAL_CORREO)
  const listo = estado.status === 'done'
  return (
    <details className="group rounded-[12px] border border-line-panel" open={pedido.status === 'sent' || estado.status === 'error'}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-[14.5px] font-medium [&::-webkit-details-marker]:hidden">
        {t('Cambiar el correo', 'Change the email')}
        <span aria-hidden className="text-ink-mute transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-line-panel px-4 py-4">
        {listo ? (
          <p className="text-[14px] text-ink" role="status">
            {estado.message}
          </p>
        ) : (
          <>
            <p className="text-[14px] text-ink-mute">
              {t(`Te mandamos un código a ${correo} para confirmar que eres tú.`, `We’ll send a code to ${correo} to confirm it’s you.`)}
            </p>
            <button
              aria-busy={pidiendo}
              className="min-h-11 self-start cursor-pointer rounded-[10px] border border-line-panel-strong bg-bg-raised px-4 text-[14.5px] font-medium text-ink hover:border-gold disabled:opacity-60"
              disabled={pidiendo}
              onClick={() => pedir(async () => setPedido(await requestAccountCodeAction()))}
              type="button"
            >
              {pidiendo ? t('Enviando…', 'Sending…') : pedido.status === 'sent' ? t('Mandarme otro código', 'Send me another code') : t('Mandarme el código', 'Send me the code')}
            </button>
            {pedido.message === '' ? null : (
              <p className={`text-[13.5px] ${pedido.status === 'error' ? 'text-danger' : 'text-ink-soft'}`} role={pedido.status === 'error' ? 'alert' : 'status'}>
                {pedido.message}
              </p>
            )}
            <form action={cambiar} className="flex flex-col gap-4">
              <Field htmlFor={`${id}-nuevo`} label={t('Correo nuevo', 'New email')}>
                <input autoComplete="email" className={FIELD_CLASS} id={`${id}-nuevo`} inputMode="email" maxLength={254} name="correo" required type="email" />
              </Field>
              <Field htmlFor={`${id}-codigo`} label={t('Código del correo', 'Code from the email')}>
                <input autoComplete="one-time-code" className={FIELD_CLASS} id={`${id}-codigo`} inputMode="numeric" maxLength={9} name="code" required />
              </Field>
              {estado.status === 'error' ? (
                <p className="text-[13.5px] text-danger" role="alert">
                  {estado.message}
                </p>
              ) : null}
              <div className="flex justify-end">
                <SubmitButton pendingLabel={t('Cambiando…', 'Changing…')}>{t('Cambiar el correo', 'Change the email')}</SubmitButton>
              </div>
            </form>
          </>
        )}
      </div>
    </details>
  )
}
