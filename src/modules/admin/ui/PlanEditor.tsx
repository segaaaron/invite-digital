'use client'

import { useActionState, useId } from 'react'
import { Field, FIELD_CLASS, Pill } from '@/shared/design/ui/panel/PanelKit'
import { ChoiceCards, SettingsSection, SwitchRow, UnitField } from '@/shared/design/ui/panel/ajustes'
import { type AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { savePlanAction } from '@/app/_acciones/admin/planes-actions'
import { MAX_FUNCIONES, type TextoPlanLimpio } from '../domain/plan-editable'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'

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
  readonly highlighted: boolean
  readonly isActive: boolean
  readonly eventos: number
  readonly es: TextoPlanLimpio | null
  readonly en: TextoPlanLimpio | null
}

const FUNCIONES = [
  { name: 'includesSeating', label: 'Mesas y plano del salón', description: 'Sentar a cada grupo y dibujar el salón.' },
  { name: 'includesRegistry', label: 'Mesa de regalos y fondos', description: 'Regalos que se reservan y fondos en efectivo con meta.' },
  { name: 'includesCheckin', label: 'Modo puerta', description: 'Pases QR en la entrada. Los porteros se topan arriba.' },
  { name: 'guestPhotos', label: 'Fotos de los invitados', description: 'Cada invitado sube sus fotos desde su invitación.' },
  { name: 'eventPassword', label: 'Invitación con contraseña', description: 'La invitación pide una contraseña antes de abrirse.' },
  { name: 'csvImport', label: 'Importar la lista desde Excel (CSV)', description: 'Cargar todos los grupos de una vez.' },
] as const

const vacioSiNulo = (n: number | null) => (n === null ? '' : String(n))

/**
 * Un plan, editable entero, en secciones con su explicación al lado (patrón de ajustes de
 * Polaris). Un formulario por plan y **su propio estado**: guardar uno no pinta el acierto en
 * los otros. Los nombres de los campos son los que lee `savePlanAction`.
 */
export function PlanEditor({ plan }: { plan: PlanEditorView }) {
  const [estado, guardar, guardando] = useActionState(savePlanAction, INICIAL)
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
            <span className="text-ink [font-variant-numeric:lining-nums]">{plan.priceLabel}</span> por evento ·{' '}
            {plan.eventos} evento{plan.eventos === 1 ? '' : 's'} con este plan
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone={plan.isActive ? 'ok' : 'no'}>{plan.isActive ? 'Se vende' : 'Retirado'}</Pill>
          {plan.highlighted ? <Pill tone="pending">Destacado</Pill> : null}
        </div>
      </header>

      <SettingsSection description="Lo que paga el cliente y si el plan aparece en la web." title="Precio y venta">
        <div className="max-w-[260px]">
          <UnitField decimal defaultValue={txt('price', plan.price)} id={`${id}-precio`} label="Precio" name="price" prefix="Bs" required />
        </div>
        <div className="flex flex-col divide-y divide-line-panel">
          <SwitchRow defaultChecked={chk('isActive', plan.isActive)} description="Apagado, deja de venderse. Los eventos que ya lo tienen lo conservan." label="A la venta" name="isActive" />
          <SwitchRow defaultChecked={chk('highlighted', plan.highlighted)} description="La tarjeta oscura con «Más elegido» en los precios." label="Destacado en la web" name="highlighted" />
        </div>
      </SettingsSection>

      <SettingsSection description="Deja vacío lo que no tiene tope. El servidor corta al llegar al límite." title="Límites">
        <div className="grid gap-4 min-[560px]:grid-cols-2 min-[1200px]:grid-cols-3">
          <UnitField defaultValue={txt('maxGuestGroups', vacioSiNulo(plan.maxGuestGroups))} id={`${id}-tope`} label="Grupos de invitados" name="maxGuestGroups" placeholder="Sin límite" unit="grupos" />
          <UnitField defaultValue={txt('maxGalleryPhotos', vacioSiNulo(plan.maxGalleryPhotos))} id={`${id}-fotos`} label="Fotos del evento" name="maxGalleryPhotos" placeholder="Sin límite" unit="fotos" />
          <UnitField defaultValue={txt('onlineDays', String(plan.onlineDays))} id={`${id}-dias`} label="En línea tras la fiesta" name="onlineDays" required unit="días" />
          <UnitField defaultValue={txt('maxCohosts', vacioSiNulo(plan.maxCohosts))} id={`${id}-coanfitriones`} label="Co-anfitriones" name="maxCohosts" placeholder="Sin límite" unit="personas" />
          <UnitField
            defaultValue={txt('maxHiredPlanners', vacioSiNulo(plan.maxHiredPlanners))}
            hint="0 si no se puede sumar planner."
            id={`${id}-planners`}
            label="Planners contratados"
            name="maxHiredPlanners"
            placeholder="Sin límite"
            unit="personas"
          />
          <UnitField defaultValue={txt('maxDoorPorters', String(plan.maxDoorPorters))} hint="0 si no trae porteros." id={`${id}-porteros`} label="Porteros" name="maxDoorPorters" required unit="porteros" />
        </div>
      </SettingsSection>

      <SettingsSection description="Lo que se abre en el panel del evento. Apagado, la pantalla enseña que el plan no lo incluye." title="Funciones incluidas">
        <div className="flex flex-col divide-y divide-line-panel">
          {FUNCIONES.map((f) => (
            <SwitchRow defaultChecked={chk(f.name, plan[f.name])} description={f.description} key={f.name} label={f.label} name={f.name} />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection description="Hasta dónde llega el planner del evento y cuándo se puede cambiar de diseño." title="Planner y diseño">
        <ChoiceCards
          defaultValue={txt('plannerSuite', plan.plannerSuite)}
          legend="Planner"
          name="plannerSuite"
          options={[
            { value: 'esencial', label: 'Esencial', description: 'Tareas y presupuesto.' },
            { value: 'completo', label: 'Completo', description: 'Más proveedores, cronograma, cortejo y documentos.' },
            { value: 'total', label: 'Total', description: 'Más el Día D y los enlaces para proveedores.' },
          ]}
        />
        <ChoiceCards
          defaultValue={txt('designChange', plan.designChange)}
          legend="Cambiar de modelo"
          name="designChange"
          options={[
            { value: 'ninguno', label: 'Nunca', description: 'El modelo elegido se queda.' },
            { value: 'antes_de_repartir', label: 'Hasta repartir', description: 'Mientras no haya salido ningún enlace.' },
            { value: 'siempre', label: 'Siempre', description: 'En cualquier momento, dentro de la misma fiesta.' },
          ]}
        />
      </SettingsSection>

      <SettingsSection description="Nombre, lema y la lista de la tarjeta de precios, en cada idioma." title="Textos de la web">
        {/* Abierto tras un error: un campo con fallo no puede quedar escondido. */}
        <details className="group rounded-[14px] border border-line-panel bg-bg-top/40" open={enviado !== undefined}>
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] text-ink">
            <span>
              {plan.es?.tagline ? <>«{plan.es.tagline}» · </> : null}
              <span className="text-ink-mute">{plan.es?.features.length ?? 0} funciones en la tarjeta</span>
            </span>
            <span className="text-[12px] text-ink-mute group-open:hidden">Editar textos</span>
            <span className="hidden text-[12px] text-ink-mute group-open:inline">Cerrar</span>
          </summary>
          <div className="grid gap-5 border-t border-line-panel p-4 min-[900px]:grid-cols-2">
            {(['es', 'en'] as const).map((locale) => {
              const t = plan[locale]
              return (
                <fieldset className="flex flex-col gap-3" key={locale}>
                  <legend className="mb-1 text-[13px] font-medium text-ink">{locale === 'es' ? 'Español' : 'Inglés'}</legend>
                  <Field htmlFor={`${id}-${locale}-nombre`} label="Nombre">
                    <input className={FIELD_CLASS} defaultValue={txt(`${locale}.name`, t?.name ?? '')} id={`${id}-${locale}-nombre`} name={`${locale}.name`} required />
                  </Field>
                  <Field htmlFor={`${id}-${locale}-lema`} label="Lema">
                    <input className={FIELD_CLASS} defaultValue={txt(`${locale}.tagline`, t?.tagline ?? '')} id={`${id}-${locale}-lema`} name={`${locale}.tagline`} />
                  </Field>
                  <Field htmlFor={`${id}-${locale}-desc`} label="Descripción">
                    <textarea className={`${FIELD_CLASS} min-h-[70px] resize-y`} defaultValue={txt(`${locale}.description`, t?.description ?? '')} id={`${id}-${locale}-desc`} name={`${locale}.description`} />
                  </Field>
                  <Field hint={`Una por línea, hasta ${MAX_FUNCIONES}.`} htmlFor={`${id}-${locale}-func`} label="Funciones de la tarjeta">
                    <textarea
                      className={`${FIELD_CLASS} min-h-[160px] resize-y text-[13px] leading-[1.7]`}
                      defaultValue={txt(`${locale}.features`, t?.features.join('\n') ?? '')}
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

      <footer className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t border-line-panel bg-bg-raised/95 px-1 py-4 backdrop-blur">
        <SubmitButton pending={guardando} pendingLabel="Guardando…" variant="primary">
          Guardar plan
        </SubmitButton>
        {plan.eventos > 0 ? (
          <span className="text-[12px] text-ink-mute">
            Los límites y funciones se aplican ya a sus {plan.eventos} evento{plan.eventos === 1 ? '' : 's'}.
          </span>
        ) : null}
        <div className="w-full">
          <ActionFeedback state={estado} />
        </div>
      </footer>
    </form>
  )
}
