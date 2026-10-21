'use client'

import { useActionState, useId } from 'react'
import { Field, FIELD_CLASS, Pill } from '@/shared/design/ui/panel/PanelKit'
import { ChoiceCards, SettingsSection, SwitchRow, UnitField } from '@/shared/design/ui/panel/ajustes'
import type { AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { savePlanAction } from '@/app/_acciones/admin/planes-actions'
import { MAX_FUNCIONES, type TextoPlanLimpio } from '../domain/plan-editable'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import type { T } from '@/shared/i18n/t'
import { useT } from '@/shared/i18n/idioma-navegador'

const INICIAL: AdminActionState = { status: 'idle' }

export type PlanEditorView = {
  readonly slug: string
  /** Ya formateado para el campo: `690` o `1450,50`. */
  readonly price: string
  readonly priceLabel: string
  readonly maxGuestGroups: number | null
  readonly includesSeating: boolean
  readonly includesRegistry: boolean
  readonly includesCheckin: boolean
  readonly includesGuestbook: boolean
  readonly includesGiftWays: boolean
  readonly includesStyle: boolean
  readonly maxDoorPorters: number
  readonly maxCohosts: number | null
  readonly maxHiredPlanners: number | null
  readonly maxGalleryPhotos: number | null
  readonly guestPhotos: boolean
  readonly eventPassword: boolean
  readonly csvImport: boolean
  readonly onlineDays: number
  readonly designChange: string
  readonly plannerSuite: string
  readonly depositPct: number
  /** La reserva fija en Bs como texto del campo; vacía, no hay. */
  readonly depositFixed: string
  readonly priceUsd: string
  /** El precio de lista, el que se tacha. Vacío: sin promoción. */
  readonly priceBefore: string
  readonly correctionRounds: string
  readonly deliveryDays: string
  readonly highlighted: boolean
  readonly isActive: boolean
  readonly eventos: number
  readonly es: TextoPlanLimpio | null
  readonly en: TextoPlanLimpio | null
}

const funciones = (t: T) =>
  [
    { name: 'includesSeating', label: t('Mesas y plano del salón', 'Tables and floor plan'), description: t('Sentar a cada invitado y dibujar el salón.', 'Seat every guest and draw the venue.') },
    { name: 'includesRegistry', label: t('Mesa de regalos y fondos', 'Gift registry and funds'), description: t('Regalos que se reservan y fondos en efectivo con meta.', 'Gifts that get reserved and cash funds with a goal.') },
    { name: 'includesCheckin', label: t('Modo puerta', 'Door mode'), description: t('Pases QR en la entrada. El personal de recepción se topa arriba.', 'QR passes at the door. Reception staff is capped above.') },
    { name: 'includesGuestbook', label: t('Libro de firmas', 'Guestbook'), description: t('Los invitados dejan un mensaje al confirmar. Apagado, quien ya tiene mensajes los conserva.', 'Guests leave a message when they RSVP. Off, whoever already has messages keeps them.') },
    { name: 'includesGiftWays', label: t('Lluvia de sobres y QR de transferencia', 'Envelope gifts and transfer QR'), description: t('Las formas de regalar en la invitación. Apagado, quien ya las configuró las conserva.', 'The ways to give in the invitation. Off, whoever already set them up keeps them.') },
    { name: 'includesStyle', label: t('Colores y letra a su gusto', 'Their own colours and fonts'), description: t('El cliente elige el color de acento y la caligrafía de su diseño. Apagado, quien ya los eligió los conserva.', 'The client picks the accent colour and script of their design. Off, whoever already chose them keeps them.') },
    { name: 'guestPhotos', label: t('Fotos de los invitados', 'Guest photos'), description: t('Cada invitado sube sus fotos desde su invitación.', 'Each guest uploads their photos from their invitation.') },
    { name: 'eventPassword', label: t('Invitación con contraseña', 'Password-protected invitation'), description: t('La invitación pide una contraseña antes de abrirse.', 'The invitation asks for a password before opening.') },
    { name: 'csvImport', label: t('Importar la lista desde Excel (CSV)', 'Import the list from Excel (CSV)'), description: t('Cargar todos los invitados de una vez.', 'Load all guests at once.') },
  ] as const

const vacioSiNulo = (n: number | null) => (n === null ? '' : String(n))

/**
 * Un plan, editable entero, en secciones con su explicación al lado (patrón de ajustes de
 * Polaris). Un formulario por plan y **su propio estado**: guardar uno no pinta el acierto en
 * los otros. Los nombres de los campos son los que lee `savePlanAction`.
 */
export function PlanEditor({ plan }: { plan: PlanEditorView }) {
  const t = useT()
  const [estado, guardar, guardando] = useActionState(sinCaerse(savePlanAction), INICIAL)
  const id = useId()
  // Tras un error, lo enviado manda sobre lo guardado: React vacía el formulario al acabar la
  // acción y lo devuelve a sus `defaultValue`, así que esos tienen que ser lo que se escribió.
  const enviado = estado.status === 'error' ? estado.valores : undefined
  const txt = (nombre: string, guardado: string) => (enviado ? (enviado[nombre] ?? '') : guardado)
  const chk = (nombre: string, guardado: boolean) => (enviado ? enviado[nombre] === 'on' : guardado)
  const nombre = plan.es?.name ?? plan.slug

  return (
    // `key` remonta tras un error: las casillas no toman un `defaultChecked` nuevo al volver a pintar.
    <form key={enviado ? JSON.stringify(enviado) : plan.slug} action={guardar} aria-label={`Plan ${nombre}`} className="flex flex-col">
      <input name="slug" type="hidden" value={plan.slug} />

      <header className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div className="flex flex-col gap-1">
          <p className="font-display text-[30px] leading-none text-ink">{nombre}</p>
          <p className="text-[13px] text-ink-mute">
            <span className="text-ink [font-variant-numeric:lining-nums]">{plan.priceLabel}</span> {t('por evento', 'per event')} ·{' '}
            {t(`${plan.eventos} evento${plan.eventos === 1 ? '' : 's'} con este plan`, `${plan.eventos} event${plan.eventos === 1 ? '' : 's'} on this plan`)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone={plan.isActive ? 'ok' : 'no'}>{plan.isActive ? t('Se vende', 'For sale') : t('Retirado', 'Withdrawn')}</Pill>
          {plan.highlighted ? <Pill tone="pending">{t('Destacado', 'Featured')}</Pill> : null}
        </div>
      </header>

      <SettingsSection description={t('Lo que paga el cliente y si el plan aparece en la web.', 'What the client pays and whether the plan appears on the website.')} title={t('Precio y venta', 'Price and sale')}>
        <div className="grid max-w-[540px] gap-4 min-[560px]:grid-cols-2">
          <UnitField decimal defaultValue={txt('price', plan.price)} id={`${id}-precio`} label={t('Precio', 'Price')} name="price" prefix="Bs" required />
          <UnitField
            decimal
            defaultValue={txt('priceBefore', plan.priceBefore)}
            hint={t('El precio de antes, tachado al lado del de ahora. Vacío: sin promoción.', 'The old price, struck through next to the current one. Empty: no promotion.')}
            id={`${id}-antes`}
            label={t('Precio de lanzamiento: antes costaba', 'Launch price: it used to cost')}
            name="priceBefore"
            placeholder={t('Sin promoción', 'No promotion')}
            prefix="Bs"
          />
          <UnitField
            decimal
            defaultValue={txt('priceUsd', plan.priceUsd)}
            hint={t('Lo fijas tú: la web lo enseña junto al precio en bolivianos. Vacío, solo bolivianos.', 'You set it: the website shows it next to the price in bolivianos. Empty, bolivianos only.')}
            id={`${id}-usd`}
            label={t('Precio en dólares', 'Price in dollars')}
            name="priceUsd"
            placeholder={t('Sin precio en dólares', 'No price in dollars')}
            prefix="USD"
          />
          <UnitField
            defaultValue={txt('depositPct', plan.depositPct === 0 ? '' : String(plan.depositPct))}
            hint={t('Con anticipo, el evento nace al aprobarlo y el saldo se registra después. Vacío: pago entero.', 'With a deposit, the event is created on approval and the balance is recorded later. Empty: full payment.')}
            id={`${id}-anticipo`}
            label={t('Anticipo para reservar', 'Deposit to book')}
            name="depositPct"
            placeholder={t('Sin anticipo', 'No deposit')}
            unit="%"
          />
          <UnitField
            decimal
            defaultValue={txt('depositFixed', plan.depositFixed)}
            hint={t('Un importe fijo para reservar (p. ej. Bs 100). Si lo pones, manda sobre el porcentaje.', 'A fixed amount to book (e.g. Bs 100). If set, it overrides the percentage.')}
            id={`${id}-reserva`}
            label={t('Reserva fija', 'Fixed booking fee')}
            name="depositFixed"
            placeholder={t('Sin reserva fija', 'No fixed booking fee')}
            prefix="Bs"
          />
        </div>
        <div className="flex flex-col divide-y divide-line-panel">
          <SwitchRow defaultChecked={chk('isActive', plan.isActive)} description={t('Apagado, deja de venderse. Los eventos que ya lo tienen lo conservan.', 'Off, it stops being sold. Events that already have it keep it.')} label={t('A la venta', 'For sale')} name="isActive" />
          <SwitchRow defaultChecked={chk('highlighted', plan.highlighted)} description={t('La tarjeta oscura con «Más elegido» en los precios.', 'The dark card with “Most chosen” in pricing.')} label={t('Destacado en la web', 'Featured on the website')} name="highlighted" />
        </div>
      </SettingsSection>

      <SettingsSection
        description={t('Si lo diseñamos nosotros: cuántas rondas de corrección trae y en cuántos días entregamos la primera versión. Vacíos los dos, el cliente escribe su invitación solo.', 'If we design it: how many revision rounds it includes and in how many days we deliver the first version. Both empty, the client writes their invitation alone.')}
        title={t('Diseño por encargo', 'Custom design')}
      >
        <div className="grid max-w-[540px] gap-4 min-[560px]:grid-cols-2">
          <UnitField defaultValue={txt('correctionRounds', plan.correctionRounds)} id={`${id}-rondas`} label={t('Rondas de corrección', 'Revision rounds')} name="correctionRounds" placeholder={t('Autoservicio', 'Self-service')} unit={t('rondas', 'rounds')} />
          <UnitField defaultValue={txt('deliveryDays', plan.deliveryDays)} id={`${id}-entrega`} label={t('Entrega de la primera versión', 'First version delivery')} name="deliveryDays" placeholder={t('Autoservicio', 'Self-service')} unit={t('días', 'days')} />
        </div>
      </SettingsSection>

      <SettingsSection description={t('Deja vacío lo que no tiene tope. El servidor corta al llegar al límite.', 'Leave empty what has no cap. The server cuts off at the limit.')} title={t('Límites', 'Limits')}>
        <div className="grid gap-4 min-[560px]:grid-cols-2 min-[1200px]:grid-cols-3">
          <UnitField
            defaultValue={txt('maxGuestGroups', vacioSiNulo(plan.maxGuestGroups))}
            hint={t('Cada invitación es un enlace: una familia o un grupo, no una persona.', 'Each invitation is a link: a family or a group, not a person.')}
            id={`${id}-tope`}
            label={t('Invitaciones', 'Invitations')}
            name="maxGuestGroups"
            placeholder={t('Sin límite', 'Unlimited')}
            unit={t('invitaciones', 'invitations')}
          />
          <UnitField defaultValue={txt('maxGalleryPhotos', vacioSiNulo(plan.maxGalleryPhotos))} id={`${id}-fotos`} label={t('Fotos del evento', 'Event photos')} name="maxGalleryPhotos" placeholder={t('Sin límite', 'Unlimited')} unit={t('fotos', 'photos')} />
          <UnitField defaultValue={txt('onlineDays', String(plan.onlineDays))} id={`${id}-dias`} label={t('En línea tras la fiesta', 'Online after the party')} name="onlineDays" required unit={t('días', 'days')} />
          <UnitField
            defaultValue={txt('maxHiredPlanners', vacioSiNulo(plan.maxHiredPlanners))}
            hint={t('0 si no se puede sumar planner.', '0 if a planner cannot be added.')}
            id={`${id}-planners`}
            label={t('Planners contratados', 'Hired planners')}
            name="maxHiredPlanners"
            placeholder={t('Sin límite', 'Unlimited')}
            unit={t('personas', 'people')}
          />
          <UnitField defaultValue={txt('maxDoorPorters', String(plan.maxDoorPorters))} hint={t('0 si no trae recepción.', '0 if it has no reception.')} id={`${id}-porteros`} label={t('Recepción', 'Reception')} name="maxDoorPorters" required unit={t('personas', 'people')} />
        </div>
      </SettingsSection>

      <SettingsSection description={t('Lo que se abre en el panel del evento. Apagado, la pantalla enseña que el plan no lo incluye.', 'What opens in the event panel. Off, the screen shows the plan does not include it.')} title={t('Funciones incluidas', 'Included features')}>
        <div className="flex flex-col divide-y divide-line-panel">
          {funciones(t).map((f) => (
            <SwitchRow defaultChecked={chk(f.name, plan[f.name])} description={f.description} key={f.name} label={f.label} name={f.name} />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection description={t('Hasta dónde llega el planner del evento y cuándo se puede cambiar de diseño.', 'How far the event planner goes and when the design can be changed.')} title={t('Planner y diseño', 'Planner and design')}>
        <ChoiceCards
          defaultValue={txt('plannerSuite', plan.plannerSuite)}
          legend="Planner"
          name="plannerSuite"
          options={[
            { value: 'esencial', label: t('Esencial', 'Essential'), description: t('Tareas y presupuesto.', 'Tasks and budget.') },
            { value: 'completo', label: t('Completo', 'Complete'), description: t('Más proveedores, cronograma, cortejo y documentos.', 'Plus vendors, schedule, wedding party and documents.') },
            { value: 'total', label: t('Total', 'Total'), description: t('Más el Día D y los enlaces para proveedores.', 'Plus the big day and vendor links.') },
          ]}
        />
        <ChoiceCards
          defaultValue={txt('designChange', plan.designChange)}
          legend={t('Cambiar de modelo', 'Change design')}
          name="designChange"
          options={[
            { value: 'ninguno', label: t('Nunca', 'Never'), description: t('El modelo elegido se queda.', 'The chosen design stays.') },
            { value: 'antes_de_repartir', label: t('Hasta repartir', 'Until sending'), description: t('Mientras no haya salido ningún enlace.', 'While no link has gone out.') },
            { value: 'siempre', label: t('Siempre', 'Always'), description: t('En cualquier momento, dentro de la misma fiesta.', 'At any time, within the same kind of party.') },
          ]}
        />
      </SettingsSection>

      <SettingsSection description={t('Nombre, lema y la lista de la tarjeta de precios, en cada idioma.', 'Name, tagline and the pricing card list, in each language.')} title={t('Textos de la web', 'Website texts')}>
        {/* Abierto tras un error: un campo con fallo no puede quedar escondido. */}
        <details className="group rounded-[14px] border border-line-panel bg-bg-top/40" open={enviado !== undefined}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] text-ink">
            <span>
              {plan.es?.tagline ? <>«{plan.es.tagline}» · </> : null}
              <span className="text-ink-mute">{plan.es?.features.length ?? 0} funciones en la tarjeta</span>
            </span>
            <span className="text-[12px] text-ink-mute group-open:hidden">{t('Editar textos', 'Edit texts')}</span>
            <span className="hidden text-[12px] text-ink-mute group-open:inline">{t('Cerrar', 'Close')}</span>
          </summary>
          <div className="grid gap-5 border-t border-line-panel p-4 min-[900px]:grid-cols-2">
            {(['es', 'en'] as const).map((locale) => {
              const tx = plan[locale]
              return (
                <fieldset className="flex flex-col gap-3" key={locale}>
                  <legend className="mb-1 text-[13px] font-medium text-ink">{locale === 'es' ? t('Español', 'Spanish') : t('Inglés', 'English')}</legend>
                  <Field htmlFor={`${id}-${locale}-nombre`} label={t('Nombre', 'Name')}>
                    <input className={FIELD_CLASS} defaultValue={txt(`${locale}.name`, tx?.name ?? '')} id={`${id}-${locale}-nombre`} name={`${locale}.name`} required />
                  </Field>
                  <Field htmlFor={`${id}-${locale}-lema`} label={t('Lema', 'Tagline')}>
                    <input className={FIELD_CLASS} defaultValue={txt(`${locale}.tagline`, tx?.tagline ?? '')} id={`${id}-${locale}-lema`} name={`${locale}.tagline`} />
                  </Field>
                  <Field htmlFor={`${id}-${locale}-desc`} label={t('Descripción', 'Description')}>
                    <textarea className={`${FIELD_CLASS} min-h-[70px] resize-y`} defaultValue={txt(`${locale}.description`, tx?.description ?? '')} id={`${id}-${locale}-desc`} name={`${locale}.description`} />
                  </Field>
                  <Field hint={t(`Una por línea, hasta ${MAX_FUNCIONES}.`, `One per line, up to ${MAX_FUNCIONES}.`)} htmlFor={`${id}-${locale}-func`} label={t('Funciones de la tarjeta', 'Card features')}>
                    <textarea
                      className={`${FIELD_CLASS} min-h-[160px] resize-y text-[13px] leading-[1.7]`}
                      defaultValue={txt(`${locale}.features`, tx?.features.join('\n') ?? '')}
                      id={`${id}-${locale}-func`}
                      name={`${locale}.features`}
                      required
                    />
                  </Field>
                </fieldset>
              )
            })}
          </div>
        </details>
      </SettingsSection>

      <footer className="sticky bottom-0 max-[767px]:bottom-[calc(64px+env(safe-area-inset-bottom))] -mx-1 flex flex-wrap items-center gap-3 border-t border-line-panel bg-bg-raised/95 px-1 py-4 backdrop-blur">
        <SubmitButton pending={guardando} pendingLabel={t('Guardando…', 'Saving…')} variant="primary">
          {t('Guardar plan', 'Save plan')}
        </SubmitButton>
        {plan.eventos > 0 ? (
          <span className="text-[12px] text-ink-mute">
            {t(
              plan.eventos === 1 ? 'Los límites y funciones se aplican ya a su evento.' : `Los límites y funciones se aplican ya a sus ${plan.eventos} eventos.`,
              `Limits and features apply right away to its ${plan.eventos} event${plan.eventos === 1 ? '' : 's'}.`,
            )}
          </span>
        ) : null}
        <div className="w-full">
          <ActionFeedback state={estado} />
        </div>
      </footer>
    </form>
  )
}
