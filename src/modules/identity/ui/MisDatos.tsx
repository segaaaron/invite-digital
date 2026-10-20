'use client'

import { useActionState, useId, useState } from 'react'
import { cambiarCorreoAction, guardarMisDatosAction, pedirCodigoDeCorreoNuevoAction, type CodigoDeCuentaState, type MisDatosState } from '@/app/_acciones/identity/actions'
import { FIELD_CLASS, Field } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'

const INICIAL: MisDatosState = { status: 'idle' }
const INICIAL_CORREO: CodigoDeCuentaState = { status: 'idle', message: '' }

/** «Tus datos» (E21): nombre y teléfono se guardan aquí; el correo se cambia aparte, con el código de su correo actual. */
export function MisDatos({
  nombre,
  correo,
  telefono,
  ayudaCorreo,
  cambiaCorreo = true,
  correoPendiente = null,
}: {
  nombre: string | null
  correo: string
  telefono: string | null
  ayudaCorreo: string
  cambiaCorreo?: boolean
  /** La dirección nueva que ya tiene su código vivo (`0098`): el paso dos vuelve solo al recargar. */
  correoPendiente?: string | null
}) {
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
    {cambiaCorreo ? <CambiarCorreo correo={correo} pendiente={correoPendiente} /> : null}
    </>
  )
}

/**
 * Cambiar el correo, en dos pasos (20 oct, F12 del escaneo): se escribe la dirección nueva, el código viaja **a esa
 * dirección** y el cambio solo se aplica con él. Antes el código llegaba al correo actual y la dirección nueva no se
 * comprobaba: una cuenta podía ponerse el correo de alguien que estaba por comprar y heredar su acceso al evento.
 * Al terminar, el correo anterior recibe el aviso.
 */
function CambiarCorreo({ correo, pendiente }: { correo: string; pendiente: string | null }) {
  const t = useT()
  const id = useId()
  const [nuevo, setNuevo] = useState(pendiente ?? '')
  const [pedido, pedirCodigo] = useActionState(sinCaerse(pedirCodigoDeCorreoNuevoAction), INICIAL_CORREO)
  const [estado, cambiar] = useActionState(sinCaerse(cambiarCorreoAction), INICIAL_CORREO)
  const listo = estado.status === 'done'
  // El paso dos sale también cuando el código ya está pedido y vivo (`pendiente`): recargar la
  // página dejaba el código válido diez minutos y ninguna casilla donde escribirlo.
  const enviado = pedido.status === 'sent' || (pendiente !== null && pedido.status !== 'error' && !listo)
  return (
    <details className="group rounded-[12px] border border-line-panel" open={enviado || estado.status === 'error'}>
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
              {t(
                `Ahora entras con ${correo}. Escribe el correo nuevo: te mandamos un código ahí para comprobar que es tuyo.`,
                `You currently sign in with ${correo}. Enter the new email: we’ll send a code there to check it is yours.`,
              )}
            </p>

            <form action={pedirCodigo} className="flex flex-col gap-4">
              <Field htmlFor={`${id}-nuevo`} label={t('Correo nuevo', 'New email')}>
                <input
                  autoComplete="email"
                  className={FIELD_CLASS}
                  id={`${id}-nuevo`}
                  inputMode="email"
                  maxLength={254}
                  name="correo"
                  onChange={(e) => setNuevo(e.target.value)}
                  required
                  type="email"
                  value={nuevo}
                />
              </Field>
              {pedido.message === '' && pendiente !== null ? (
                // Al volver a la página el mensaje de la acción ya no está: lo dice la base.
                <p className="text-[13.5px] text-ink-soft" role="status">
                  {t(`Ya te mandamos un código a ${pendiente}. Escríbelo abajo, o pide otro.`, `We already sent a code to ${pendiente}. Enter it below, or request another.`)}
                </p>
              ) : pedido.message === '' ? null : (
                <p className={`text-[13.5px] ${pedido.status === 'error' ? 'text-danger' : 'text-ink-soft'}`} role={pedido.status === 'error' ? 'alert' : 'status'}>
                  {pedido.message}
                </p>
              )}
              <div className="flex justify-end">
                <SubmitButton pendingLabel={t('Enviando…', 'Sending…')}>
                  {enviado ? t('Mandar otro código', 'Send another code') : t('Mandarme el código a ese correo', 'Send the code to that email')}
                </SubmitButton>
              </div>
            </form>

            {enviado ? (
              <form action={cambiar} className="flex flex-col gap-4 border-t border-line-panel pt-4">
                {/* La dirección viaja otra vez: el servidor exige que sea **la misma** para la que emitió el código. */}
                <input name="correo" type="hidden" value={nuevo} readOnly />
                <Field htmlFor={`${id}-codigo`} label={t('Código que llegó al correo nuevo', 'Code sent to the new email')}>
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
            ) : null}
          </>
        )}
      </div>
    </details>
  )
}
