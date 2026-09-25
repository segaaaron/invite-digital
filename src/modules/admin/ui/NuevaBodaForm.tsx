'use client'

import { CampoFecha } from '@/shared/design/ui/panel/campos-de-fecha'
import Image from '@/shared/design/ui/ImagenConCarga'
import Link from 'next/link'
import { useActionState, useId, useState, type ReactNode } from 'react'
import { CalendarIcon, CheckIcon, EyeIcon, MailIcon } from '@/shared/design/ui/icons'
import { FIELD_CLASS, LABEL_CLASS, PanelAlert, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { createWeddingForClientAction, type NuevaBodaState } from '@/app/_acciones/admin/bodas-actions'
import { FIESTAS, VOCABULARIO, VOCABULARIO_GENERICO } from '@/modules/events'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { CampoContrasena } from '@/shared/design/ui/panel/CampoContrasena'

const INICIAL: NuevaBodaState = { status: 'idle' }

/** El ejemplo de nombre por fiesta, buscado por el plural con el que se agrupan los modelos. */
const EJEMPLO_DE_NOMBRE: Record<string, string> = Object.fromEntries(
  [...FIESTAS.map((fiesta) => VOCABULARIO[fiesta]), VOCABULARIO_GENERICO].map((v) => [v.plural, v.ejemploNombre]),
)

export type ModeloElegible = { readonly key: string; readonly label: string; readonly categoria: string }
export type PlanElegible = { readonly slug: string; readonly nombre: string; readonly precio: string }

/** Lo que trae un pedido aprobado sin evento: el alta nace rellena y, al crearse, lo enlaza. */
export type DesdePedido = {
  readonly ref: string
  readonly modelo: string | null
  readonly plan: string | null
  readonly titulo: string
  readonly fecha: string | null
  readonly nombre: string
  readonly correo: string | null
  readonly telefono: string | null
}

const FECHA = new Intl.DateTimeFormat('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

/** Sin 0/O ni 1/l/I: la contraseña se dicta por teléfono o se copia de un mensaje. */
const ALFABETO = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generarClave(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(14))
  return [...bytes].map((b) => ALFABETO[b % ALFABETO.length]).join('')
}

/**
 * Crear el evento de un cliente —boda, XV años o cumpleaños— con su modelo, su plan y su
 * acceso.
 *
 * **Un flujo en cuatro pasos a la vista, con el resumen al lado**, y no un formulario plano:
 * el modelo se elige **mirándolo** (la portada de cada diseño, como en la web que vio el
 * cliente), el plan se elige con su precio, y el resumen dice en todo momento qué se va a
 * crear antes de pulsar. Revelado progresivo por pasos numerados, sin ocultar ninguno: son
 * pocos campos y ver el recorrido entero da confianza.
 *
 * Los campos se envían con los mismos nombres de siempre (`themeKey`, `title`, `eventDate`,
 * `planSlug`, `clientName`, `clientPhone`, `clientEmail`, `clientPassword`).
 */
export function NuevaBodaForm({ modelos, planes, pedido }: { modelos: readonly ModeloElegible[]; planes: readonly PlanElegible[]; pedido?: DesdePedido | undefined }) {
  const [estado, crear, creando] = useActionState<NuevaBodaState, FormData>(createWeddingForClientAction, INICIAL)
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
  const [clave, setClave] = useState('')
  const [copiada, setCopiada] = useState(false)

  const elegido = modelos.find((m) => m.key === modelo)
  const planElegido = planes.find((p) => p.slug === plan)
  const visibles = modelos.filter((m) => m.categoria === categoria)

  return (
    <form action={crear} className="grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_320px]">
      <input name="themeKey" type="hidden" value={modelo} />
      {pedido === undefined ? null : <input name="orderRef" type="hidden" value={pedido.ref} />}
      <input name="planSlug" type="hidden" value={plan} />

      <div className="flex min-w-0 flex-col gap-7">
        <Paso numero={1} titulo="El diseño que eligió" ayuda="El tipo de evento lo decide el modelo. Se puede cambiar después sin perder lo escrito.">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de evento">
            {categorias.map((c) => (
              <button
                aria-pressed={categoria === c}
                className={`cursor-pointer rounded-[var(--radius-pill)] border px-4 py-2 font-mono text-[10px] tracking-[0.25em] uppercase transition-colors ${
                  categoria === c ? 'border-ink bg-ink text-white' : 'border-line-panel-strong bg-white text-ink-soft hover:border-ink hover:text-ink'
                }`}
                key={c}
                onClick={() => {
                  setCategoria(c)
                  const primero = modelos.find((m) => m.categoria === c)
                  if (primero && elegido?.categoria !== c) setModelo(primero.key)
                }}
                type="button"
              >
                {c} · {modelos.filter((m) => m.categoria === c).length}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 min-[560px]:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]" role="radiogroup" aria-label="Modelo">
            {visibles.map((m) => {
              const activo = m.key === modelo
              return (
                <div className="group relative" key={m.key}>
                  <button
                    aria-checked={activo}
                    className={`block w-full cursor-pointer overflow-hidden rounded-[14px] border bg-white text-left transition-all ${
                      activo ? 'border-ink shadow-float ring-2 ring-ink' : 'border-line-panel hover:-translate-y-0.5 hover:shadow-card'
                    }`}
                    onClick={() => setModelo(m.key)}
                    role="radio"
                    type="button"
                  >
                    <span className="relative block aspect-[3/4] bg-bg-sunken">
                      <Image alt="" className="object-cover object-top" fill sizes="160px" src={`/templates/${m.key}.avif`} />
                      {activo ? (
                        <span className="absolute top-2 left-2 grid size-6 place-items-center rounded-full bg-ink text-white">
                          <CheckIcon className="size-3.5" />
                        </span>
                      ) : null}
                    </span>
                    <span className="block px-3 py-2 font-display text-[15px] leading-tight text-ink">{m.label}</span>
                  </button>
                  <a
                    aria-label={`Ver el modelo ${m.label} en una pestaña nueva`}
                    className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-white/90 text-ink-soft opacity-0 shadow-card transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    href={`/modelos/es/${m.key}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <EyeIcon className="size-3.5" />
                  </a>
                </div>
              )
            })}
          </div>
        </Paso>

        <Paso numero={2} titulo="El evento">
          <div className="grid gap-4 min-[560px]:grid-cols-[minmax(0,1fr)_220px]">
            <div className="flex flex-col gap-2">
              <label className={LABEL_CLASS} htmlFor={`${id}-titulo`}>
                Nombre del evento
              </label>
              <input
                className={FIELD_CLASS}
                id={`${id}-titulo`}
                maxLength={160}
                name="title"
                onChange={(e) => setTitulo(e.target.value)}
                placeholder={EJEMPLO_DE_NOMBRE[categoria] ?? VOCABULARIO_GENERICO.ejemploNombre}
                required
                type="text"
                value={titulo}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={LABEL_CLASS} htmlFor={`${id}-fecha`}>
                Fecha del evento
              </label>
              <CampoFecha id={`${id}-fecha`} name="eventDate" onChange={setFecha} required valor={fecha} />
            </div>
          </div>
        </Paso>

        <Paso numero={3} titulo="El plan que compró" ayuda="Decide qué trae su panel: mesa de regalos, modo puerta, tope de invitados.">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3" role="radiogroup" aria-label="Plan">
            {planes.map((p) => {
              const activo = p.slug === plan
              return (
                <button
                  aria-checked={activo}
                  className={`flex cursor-pointer flex-col gap-1 rounded-[14px] border p-4 text-left transition-all ${
                    activo ? 'border-ink bg-ink text-white shadow-float' : 'border-line-panel bg-white text-ink hover:border-ink'
                  }`}
                  key={p.slug}
                  onClick={() => setPlan(p.slug)}
                  role="radio"
                  type="button"
                >
                  <span className="font-display text-[19px] leading-tight">{p.nombre}</span>
                  <span className={`font-mono text-[11px] tracking-[0.1em] ${activo ? 'text-white/75' : 'text-ink-mute'}`}>{p.precio}</span>
                </button>
              )
            })}
          </div>
        </Paso>

        <Paso numero={4} titulo="Su acceso al panel" ayuda="Le mandamos el acceso por correo. La primera vez que entre, el panel le pide elegir su propia contraseña.">
          <div className="grid gap-4 min-[560px]:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className={LABEL_CLASS} htmlFor={`${id}-nombre-cliente`}>
                Nombre del cliente
              </label>
              <input autoComplete="off" className={FIELD_CLASS} id={`${id}-nombre-cliente`} maxLength={160} defaultValue={pedido?.nombre} name="clientName" placeholder="María Rojas" required />
            </div>
            <div className="flex flex-col gap-2">
              <label className={LABEL_CLASS} htmlFor={`${id}-telefono-cliente`}>
                WhatsApp del cliente
              </label>
              <input autoComplete="off" className={FIELD_CLASS} id={`${id}-telefono-cliente`} defaultValue={pedido?.telefono ?? undefined} inputMode="tel" name="clientPhone" placeholder="+591 700 12345" />
            </div>
            <div className="flex flex-col gap-2">
              <label className={LABEL_CLASS} htmlFor={`${id}-correo`}>
                Correo del cliente
              </label>
              <input
                autoComplete="off"
                className={FIELD_CLASS}
                id={`${id}-correo`}
                name="clientEmail"
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="cliente@correo.com"
                required
                type="email"
                value={correo}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={LABEL_CLASS} htmlFor={`${id}-clave`}>
                Contraseña inicial
              </label>
              <div className="flex gap-2">
                <CampoContrasena
                  envoltura="min-w-0 flex-1"
                  autoComplete="new-password"
                  className={`${FIELD_CLASS} font-mono`}
                  id={`${id}-clave`}
                  minLength={12}
                  name="clientPassword"
                  onChange={(e) => {
                    setClave(e.target.value)
                    setCopiada(false)
                  }}
                  placeholder="12 caracteres o más"
                  value={clave}
                />
                <PanelButton
                  onClick={() => {
                    setClave(generarClave())
                    setCopiada(false)
                  }}
                >
                  Generar
                </PanelButton>
              </div>
              {clave === '' ? null : (
                <button
                  className="w-fit cursor-pointer text-[11px] text-ink-soft underline underline-offset-4 hover:text-ink"
                  onClick={() => void navigator.clipboard?.writeText(clave).then(() => setCopiada(true))}
                  type="button"
                >
                  {copiada ? 'Copiada' : 'Copiar la contraseña'}
                </button>
              )}
              <p className="text-[11px] leading-[1.5] text-ink-mute">
                No se vuelve a mostrar. Si ese correo ya tiene cuenta, se le da acceso sin tocarle la contraseña.
              </p>
            </div>
          </div>
        </Paso>
      </div>

      {/* El resumen: lo que se va a crear, con la portada del modelo. Fijo al lado en
          escritorio para que el botón esté siempre a la vista. */}
      <aside className="flex flex-col overflow-hidden rounded-[18px] border border-line-panel bg-white shadow-card min-[1100px]:sticky min-[1100px]:top-6">
        <div className="relative aspect-[4/3] bg-bg-sunken">
          {elegido ? <Image alt="" className="object-cover object-top" fill sizes="320px" src={`/templates/${elegido.key}.avif`} /> : null}
          <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-shell-deep/85 to-transparent px-4 pt-10 pb-3 text-white">
            <span className="block font-mono text-[10.5px] tracking-[0.16em] uppercase opacity-80">{elegido?.categoria}</span>
            <span className="block font-display text-[22px] leading-tight">{elegido?.label}</span>
          </span>
        </div>
        <dl className="flex flex-col gap-3 p-5 text-[13px]">
          <Resumen etiqueta="Evento" vacio={titulo.trim() === ''}>
            {titulo.trim() || 'Sin nombre todavía'}
          </Resumen>
          <Resumen etiqueta="Fecha" icono={<CalendarIcon className="size-3.5" />} vacio={fecha === ''}>
            {fecha === '' ? 'Sin fecha' : FECHA.format(new Date(`${fecha}T00:00:00Z`))}
          </Resumen>
          <Resumen etiqueta="Plan" vacio={planElegido === undefined}>
            {planElegido ? `${planElegido.nombre} · ${planElegido.precio}` : 'Sin plan'}
          </Resumen>
          <Resumen etiqueta="Acceso" icono={<MailIcon className="size-3.5" />} vacio={correo.trim() === ''}>
            {correo.trim() || 'Sin correo'}
          </Resumen>
        </dl>
        <div className="flex flex-col gap-3 border-t border-line-panel p-5">
          <ActionFeedback errorsOnly state={estado} />
          {estado.status === 'success' ? (
            <PanelAlert tone="ok">
              {estado.message}{' '}
              <Link className="underline underline-offset-4" href={`/panel/eventos/${estado.eventSlug}/configuracion`}>
                Abrir el evento
              </Link>
            </PanelAlert>
          ) : null}
          <SubmitButton className="w-full" variant="primary" pending={creando} pendingLabel={'Creando…'}>{'Crear el evento y su acceso'}</SubmitButton>
        </div>
      </aside>
    </form>
  )
}

function Paso({ numero, titulo, ayuda, children }: { numero: number; titulo: string; ayuda?: string; children: ReactNode }) {
  return (
    <section className="flex gap-3 min-[560px]:gap-4">
      <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line-panel-strong bg-white font-display text-[15px] min-[560px]:size-8 min-[560px]:text-[16px] text-ink [font-variant-numeric:lining-nums]">
        {numero}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 pt-0.5">
        <div>
          <h3 className="font-display text-[20px] leading-tight text-ink">{titulo}</h3>
          {ayuda ? <p className="mt-1 text-[12px] leading-[1.6] text-ink-mute">{ayuda}</p> : null}
        </div>
        {children}
      </div>
    </section>
  )
}

function Resumen({ etiqueta, icono, vacio, children }: { etiqueta: string; icono?: ReactNode; vacio: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className={LABEL_CLASS}>{etiqueta}</dt>
      <dd className={`flex items-center gap-1.5 first-letter:uppercase ${vacio ? 'text-ink-mute italic' : 'text-ink'}`}>
        {icono}
        <span className="min-w-0 truncate first-letter:uppercase">{children}</span>
      </dd>
    </div>
  )
}
