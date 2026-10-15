'use client'

import { useActionState, useId, type ReactNode } from 'react'
import { type PlannerActionState, saveBudgetPlanAction, setPaymentPaidAction } from '@/app/_acciones/planner/actions'
import { FIELD_CLASS, Field, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { type Evento, Ocultos } from './Accion'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'
import { traducir } from '@/shared/i18n/en-ingles'

const INICIAL: PlannerActionState = { status: 'idle' }

/** El primer paso: cuánto se quiere gastar. Con eso se reparte solo por categorías. */
export function BudgetStart({ evento }: { evento: Evento }) {
  const t = useT()
  const [estado, enviar, enviando] = useActionState(sinCaerse(saveBudgetPlanAction), INICIAL)
  const id = useId()
  return (
    <form action={enviar} className="flex flex-col items-start gap-4">
      <Ocultos {...evento} />
      <p className="max-w-[60ch] text-[14px] leading-[1.7] text-ink-soft">
        {t('Escribe cuánto quieres gastar en total y lo repartimos por categorías —salón, comida, fotografía, vestido…— con la guía que se usa para estas fiestas. Después lo ajustas a tu manera y ves en cada una cuánto llevas.', 'Write how much you want to spend in total and we split it into categories —venue, food, photography, dress…— using the usual guide for these parties. Then you adjust it your way and see how much you’ve spent in each.')}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Field htmlFor={`${id}-t`} label={t('Presupuesto total (Bs)', 'Total budget (Bs)')}>
          <input className={`${FIELD_CLASS} w-[220px] text-[18px]`} id={`${id}-t`} inputMode="decimal" name="total" placeholder="60000" required />
        </Field>
        <SubmitButton pending={enviando} pendingLabel={t('Repartiendo…', 'Allocating…')} variant="primary">
          {t('Repartir mi presupuesto', 'Allocate my budget')}
        </SubmitButton>
      </div>
      <ActionFeedback errorsOnly state={estado} />
    </form>
  )
}

/** «Ajustar el reparto» (diálogo): cuánto va a cada categoría. El total pasa a ser la suma. */
export function RepartoForm({ evento, categorias }: { evento: Evento; categorias: readonly { clave: string; nombre: string; campoAsignado: string }[] }) {
  const t = useT()
  const [estado, enviar, enviando] = useActionState(sinCaerse(saveBudgetPlanAction), INICIAL)
  const id = useId()
  return (
    <form action={enviar} className="flex flex-col gap-4">
      <Ocultos {...evento} extra={{ modo: 'reparto' }} />
      <div className="grid gap-3 min-[560px]:grid-cols-2">
        {categorias.map((c) => (
          <Field htmlFor={`${id}-${c.clave}`} key={c.clave} label={`${traducir(c.nombre, t)} (Bs)`}>
            <input className={FIELD_CLASS} defaultValue={c.campoAsignado} id={`${id}-${c.clave}`} inputMode="decimal" name={`asig_${c.clave}`} />
          </Field>
        ))}
      </div>
      <p className="text-[13px] text-ink-mute">{t('El presupuesto total pasa a ser la suma de lo que asignes.', 'The total budget becomes the sum of what you allocate.')}</p>
      <ActionFeedback errorsOnly state={estado} />
      <div className="flex justify-end">
        <SubmitButton pending={enviando} pendingLabel={t('Guardando…', 'Saving…')} variant="primary">
          {t('Guardar reparto', 'Save allocation')}
        </SubmitButton>
      </div>
    </form>
  )
}

export type PagoPendiente = { readonly id: string; readonly texto: string }

/** «Registrar un pago» (E61): se elige cuál de los pagos anotados ya se hizo y se marca pagado. */
export function RegistrarPagoForm({ evento, pendientes, cerrar }: { evento: Evento; pendientes: readonly PagoPendiente[]; cerrar: string }) {
  const t = useT()
  const [estado, enviar, enviando] = useActionState(sinCaerse(setPaymentPaidAction), INICIAL)
  const id = useId()
  if (estado.status === 'success') return <p className="text-[15px]">{t('Pago registrado. Ya se descuenta de lo que falta pagar.', 'Payment recorded. It is now deducted from what’s left to pay.')}</p>
  return (
    <form action={enviar} className="flex flex-col gap-4">
      <Ocultos {...evento} extra={{ paid: 'true' }} />
      <Field hint={t('Los pagos se anotan en cada gasto, con su fecha; aquí se marcan hechos.', 'Payments are added in each expense, with their date; here they’re marked done.')} htmlFor={`${id}-p`} label={t('A qué', 'For what')}>
        <select className={FIELD_CLASS} id={`${id}-p`} name="paymentId" required>
          {pendientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.texto}
            </option>
          ))}
        </select>
      </Field>
      <ActionFeedback errorsOnly state={estado} />
      <div className="flex justify-end gap-2.5">
        <PanelButton href={cerrar}>{t('Cancelar', 'Cancel')}</PanelButton>
        <SubmitButton pending={enviando} pendingLabel={t('Registrando…', 'Recording…')} variant="primary">
          {t('Registrar el pago', 'Record the payment')}
        </SubmitButton>
      </div>
    </form>
  )
}

/** El botón de la tarjeta «Próximos pagos»: marca pagado el primero. */
export function MarcarPagado({ evento, paymentId, children, ancho = false }: { evento: Evento; paymentId: string; children: ReactNode; ancho?: boolean }) {
  const t = useT()
  const [estado, enviar, enviando] = useActionState(sinCaerse(setPaymentPaidAction), INICIAL)
  return (
    <form action={enviar} className={ancho ? 'w-full' : ''}>
      <Ocultos {...evento} extra={{ paymentId, paid: 'true' }} />
      <SubmitButton className={ancho ? 'w-full' : ''} pending={enviando} pendingLabel={t('Marcando…', 'Marking…')} variant={ancho ? 'primary' : 'default'}>
        {children}
      </SubmitButton>
      <ActionFeedback errorsOnly state={estado} />
    </form>
  )
}
