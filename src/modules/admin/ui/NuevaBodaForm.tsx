'use client'

import { CampoFecha } from '@/shared/design/ui/panel/campos-de-fecha'
import Image from '@/shared/design/ui/ImagenConCarga'
import Link from 'next/link'
import { useActionState, useId, useState } from 'react'
import { CheckIcon, EyeIcon } from '@/shared/design/ui/icons'
import { FIELD_CLASS, LABEL_CLASS, PanelAlert } from '@/shared/design/ui/panel/PanelKit'
import { createWeddingForClientAction, type NuevaBodaState } from '@/app/_acciones/admin/bodas-actions'
import { FIESTAS, VOCABULARIO, VOCABULARIO_GENERICO } from '@/modules/events'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { traducir } from '@/shared/i18n/en-ingles'
import { useT } from '@/shared/i18n/idioma-navegador'

const INICIAL: NuevaBodaState = { status: 'idle' }

/** El ejemplo de nombre por fiesta, buscado por el plural con el que se agrupan los modelos. */
const EJEMPLO_DE_NOMBRE: Record<string, string> = Object.fromEntries(
  [...FIESTAS.map((fiesta) => VOCABULARIO[fiesta]), VOCABULARIO_GENERICO].map((v) => [v.plural, v.ejemploNombre]),
)

export type ModeloElegible = { readonly key: string; readonly label: string; readonly categoria: string }
export type PlanElegible = { readonly slug: string; readonly nombre: string; readonly precio: string }

/** Lo que trae un pedido aprobado sin evento: el alta nace rellena y, al crearse, lo enlaza. */
export type DesdePedido = {
  /** El pedido pagado del que nace, o `null` si nace de una consulta cerrada fuera del sistema. */
  readonly ref: string | null
  /** La consulta que queda ganada al crearse. */
  readonly consultaId: string | null
  readonly modelo: string | null
  readonly plan: string | null
  readonly titulo: string
  readonly fecha: string | null
  readonly nombre: string
  readonly correo: string | null
  readonly telefono: string | null
}



/**
 * Crear el evento de un cliente —boda, XV años o cumpleaños— con su modelo, su plan y su
 * acceso.
 *
 * La página de la maqueta (E51): el cliente, el evento y el diseño —que se elige **mirándolo**, con la portada
 * de cada modelo— y al lado «Al crear», que dice qué va a pasar antes de pulsar.
 *
 * Los campos se envían con los mismos nombres de siempre (`themeKey`, `title`, `eventDate`,
 * `planSlug`, `clientName`, `clientPhone`, `clientEmail`, `clientPassword`).
 */
export function NuevaBodaForm({
  modelos,
  planes,
  pedido,
  cancelar,
}: {
  modelos: readonly ModeloElegible[]
  planes: readonly PlanElegible[]
  pedido?: DesdePedido | undefined
  /** Adónde vuelve «Cancelar». */
  cancelar?: string
}) {
  const t = useT()
  const [estado, crear, creando] = useActionState<NuevaBodaState, FormData>(sinCaerse(createWeddingForClientAction), INICIAL)
  const id = useId()

  const categorias = [...new Set(modelos.map((m) => m.categoria))]
  // Con un pedido, lo que eligió el cliente; si su modelo ya no se asigna, el primero.
  const modeloInicial = modelos.find((m) => m.key === pedido?.modelo) ?? modelos[0]
  const [categoria, setCategoria] = useState(modeloInicial?.categoria ?? categorias[0] ?? '')
  const [modelo, setModelo] = useState(modeloInicial?.key ?? '')
  const [titulo, setTitulo] = useState(pedido?.titulo ?? '')
  const [fecha, setFecha] = useState(pedido?.fecha ?? '')
  const [plan, setPlan] = useState(planes.find((p) => p.slug === pedido?.plan)?.slug ?? planes[0]?.slug ?? '')
  const [correo, setCorreo] = useState(pedido?.correo ?? '')
  const [sinAcceso, setSinAcceso] = useState(false)

  const elegido = modelos.find((m) => m.key === modelo)
  const visibles = modelos.filter((m) => m.categoria === categoria)

  const TARJETA = 'flex flex-col gap-4 rounded-[16px] border border-line-panel bg-bg-raised p-6.5 max-[559px]:p-5'
  const TITULO = 'font-display text-[26px] leading-tight font-medium'
  const nombrePila = (pedido?.nombre ?? '').split(' ')[0] || t('El cliente', 'The client')

  return (
    // La página de la maqueta (E51): el cliente, el evento y el diseño en sus tarjetas; al lado, «Al crear» con lo que
    // va a pasar y el botón, fijo en escritorio para tenerlo siempre a la vista.
    <form action={crear} className="grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_380px]">
      <input name="themeKey" type="hidden" value={modelo} />
      {pedido?.ref ? <input name="orderRef" type="hidden" value={pedido.ref} /> : null}
      {pedido?.consultaId ? <input name="consultaId" type="hidden" value={pedido.consultaId} /> : null}
      <input name="planSlug" type="hidden" value={plan} />

      <div className="flex min-w-0 flex-col gap-6">
        <section aria-labelledby={`${id}-cliente`} className={TARJETA}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={TITULO} id={`${id}-cliente`}>
              {t('El cliente', 'The client')}
            </h2>
            {/* Un solo alta para los dos casos. Sin acceso, el evento lo lleva el atelier y nadie más entra. */}
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[14px] text-ink-soft">
              <input checked={sinAcceso} className="size-4 accent-shell-deep" name="sinAcceso" onChange={(e) => setSinAcceso(e.target.checked)} type="checkbox" />
              {t('Lo llevo yo, sin acceso del cliente', 'I run it, without client access')}
            </label>
          </div>
          <div className="grid gap-4 min-[560px]:grid-cols-2">
            {sinAcceso ? null : (
              <>
                <div className="flex flex-col gap-2">
                  <label className={LABEL_CLASS} htmlFor={`${id}-nombre-cliente`}>
                    {t('Nombre', 'Name')}
                  </label>
                  <input autoComplete="off" className={FIELD_CLASS} defaultValue={pedido?.nombre} id={`${id}-nombre-cliente`} maxLength={160} name="clientName" required />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={LABEL_CLASS} htmlFor={`${id}-correo`}>
                    {t('Correo', 'Email')}
                  </label>
                  <input autoComplete="off" className={FIELD_CLASS} id={`${id}-correo`} name="clientEmail" onChange={(e) => setCorreo(e.target.value)} required type="email" value={correo} />
                  <span className="text-[13px] text-ink-mute">{t('Le llega su acceso por correo', 'Their access arrives by email')}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className={LABEL_CLASS} htmlFor={`${id}-telefono-cliente`}>
                    {t('Teléfono', 'Phone')}
                  </label>
                  <input autoComplete="off" className={FIELD_CLASS} defaultValue={pedido?.telefono ?? undefined} id={`${id}-telefono-cliente`} inputMode="tel" name="clientPhone" />
                </div>
              </>
            )}
            <div className="flex flex-col gap-2">
              <label className={LABEL_CLASS} htmlFor={`${id}-fiesta`}>
                {t('Fiesta', 'Party')}
              </label>
              <select
                className={FIELD_CLASS}
                id={`${id}-fiesta`}
                onChange={(e) => {
                  const c = e.target.value
                  setCategoria(c)
                  const primero = modelos.find((m) => m.categoria === c)
                  if (primero && elegido?.categoria !== c) setModelo(primero.key)
                }}
                value={categoria}
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {traducir(c, t)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section aria-labelledby={`${id}-evento`} className={TARJETA}>
          <h2 className={TITULO} id={`${id}-evento`}>
            {t('El evento', 'The event')}
          </h2>
          <div className="grid gap-4 min-[560px]:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className={LABEL_CLASS} htmlFor={`${id}-titulo`}>
                {t('Nombre del evento', 'Event name')}
              </label>
              <input
                className={FIELD_CLASS}
                id={`${id}-titulo`}
                maxLength={160}
                name="title"
                onChange={(e) => setTitulo(e.target.value)}
                placeholder={traducir(EJEMPLO_DE_NOMBRE[categoria] ?? VOCABULARIO_GENERICO.ejemploNombre, t)}
                required
                type="text"
                value={titulo}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={LABEL_CLASS} htmlFor={`${id}-fecha`}>
                {t('Fecha', 'Date')}
              </label>
              <CampoFecha id={`${id}-fecha`} name="eventDate" onChange={setFecha} required valor={fecha} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={LABEL_CLASS} htmlFor={`${id}-plan`}>
                {t('Plan', 'Plan')}
              </label>
              <select className={FIELD_CLASS} id={`${id}-plan`} onChange={(e) => setPlan(e.target.value)} value={plan}>
                {planes.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.nombre}, {p.precio}
                  </option>
                ))}
              </select>
              <span className="text-[13px] text-ink-mute">{t('Decide qué trae su panel. Cobrado por fuera, no suma en Ingresos.', 'Decides what their panel includes. Billed outside, it does not add to Revenue.')}</span>
            </div>
          </div>
        </section>

        <section aria-labelledby={`${id}-diseno`} className={TARJETA}>
          <h2 className={TITULO} id={`${id}-diseno`}>
            {t('El diseño', 'The design')}
          </h2>
          <div className="grid grid-cols-2 gap-3.5 min-[560px]:grid-cols-[repeat(auto-fill,minmax(130px,1fr))]" role="radiogroup" aria-label={t('Modelo', 'Design')}>
            {visibles.map((m) => {
              const activo = m.key === modelo
              return (
                <div className="group relative" key={m.key}>
                  <button aria-checked={activo} className="block w-full cursor-pointer text-left" onClick={() => setModelo(m.key)} role="radio" type="button">
                    <span className={`relative block aspect-[13/20] overflow-hidden rounded-[10px] bg-bg-sunken transition-shadow ${activo ? 'ring-[3px] ring-gold' : 'ring-1 ring-line-panel group-hover:ring-gold/60'}`}>
                      <Image alt="" className="object-cover object-top" fill sizes="160px" src={`/templates/${m.key}.avif`} />
                    </span>
                    <span className={`mt-2 block text-[14.5px] leading-tight ${activo ? 'font-semibold' : 'font-medium'}`}>{m.label}</span>
                  </button>
                  <a
                    aria-label={t(`Ver el modelo ${m.label} en una pestaña nueva`, `See the ${m.label} design in a new tab`)}
                    className="absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-full bg-white/90 text-ink-soft opacity-0 shadow-card transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-[859px]:size-11 max-[859px]:opacity-100"
                    href={`/es/modelos/${m.key}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <EyeIcon className="size-3.5" />
                  </a>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <aside className="rounded-[18px] border border-gold/45 bg-bg-raised p-2 min-[1100px]:sticky min-[1100px]:top-24">
        <div className="flex flex-col gap-4 rounded-[12px] border border-gold/30 p-5.5">
          <h2 className={TITULO}>{t('Al crear', 'On creation')}</h2>
          <ul className="flex flex-col gap-3 text-[14.5px] leading-[1.5]">
            <li className="flex gap-2.5">
              <CheckIcon className="mt-1 size-3.5 shrink-0 text-sage-deep" />
              {t(`El evento nace en borrador con el diseño ${elegido?.label ?? 'elegido'}`, `The event starts as a draft with the ${elegido?.label ?? 'chosen'} design`)}
            </li>
            {sinAcceso ? (
              <li className="flex gap-2.5">
                <CheckIcon className="mt-1 size-3.5 shrink-0 text-sage-deep" />
                {t('Lo llevas tú: nadie más entra hasta que le des acceso', 'You run it: nobody else gets in until you give access')}
              </li>
            ) : (
              <>
                <li className="flex gap-2.5">
                  <CheckIcon className="mt-1 size-3.5 shrink-0 text-sage-deep" />
                  {pedido === undefined ? t('El cliente', 'The client') : nombrePila} {t('recibe su acceso con una contraseña provisional', 'receives their access with a temporary password')}
                </li>
                <li className="flex gap-2.5">
                  <CheckIcon className="mt-1 size-3.5 shrink-0 text-sage-deep" />
                  {t('Al entrar elige la suya y escribe su invitación', 'When signing in they choose their own and write their invitation')}
                </li>
              </>
            )}
          </ul>
          <ActionFeedback errorsOnly state={estado} />
          {estado.status === 'success' ? (
            <PanelAlert tone="ok">
              {estado.message}{' '}
              <Link className="underline underline-offset-4" href={`/panel/eventos/${estado.eventSlug}/configuracion`}>
                {t('Abrir el evento', 'Open the event')}
              </Link>
            </PanelAlert>
          ) : null}
          {/* Creado, el botón no vuelve a crear: otro clic sería un evento duplicado. */}
          <SubmitButton className="w-full" disabled={estado.status === 'success'} pending={creando} pendingLabel={t('Creando…', 'Creating…')} variant="primary">
            {estado.status === 'success' ? t('Creado ✓', 'Created ✓') : sinAcceso ? t('Crear el evento', 'Create the event') : t('Crear el evento y dar acceso', 'Create the event and give access')}
          </SubmitButton>
          {cancelar === undefined ? null : (
            <Link className="flex min-h-11 items-center justify-center text-[15px] font-medium text-gold-deep no-underline hover:underline" href={cancelar}>
              {t('Cancelar', 'Cancel')}
            </Link>
          )}
        </div>
      </aside>
    </form>
  )
}
