'use client'

import Link from 'next/link'
import { useActionState, useEffect, useId, useMemo, useRef, useState } from 'react'
import { cotizarAction, type CotizacionState } from '@/app/_acciones/admin/ventas-actions'
import { CampoFecha } from '@/shared/design/ui/panel/campos-de-fecha'
import { FIELD_CLASS, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { SubmitButton } from '@/shared/design/ui/panel/estados'
import { CheckIcon, WhatsAppIcon } from '@/shared/design/ui/icons'
import { Copiar } from './AccionesDeVenta'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

type Fiesta = 'boda' | 'xv' | 'cumple'

export type PlanCotizable = { readonly slug: string; readonly nombre: string; readonly priceCents: number; readonly depositPct: number; readonly depositFixedCents: number | null }
export type ModeloCotizable = { readonly key: string; readonly label: string; readonly fiesta: Fiesta }
export type ExtraCotizable = { readonly slug: string; readonly name: string; readonly priceCents: number; readonly que: string }

const BS = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 2 })
const bs = (cents: number) => BS.format(cents / 100).replace('BOB', 'Bs').replace(/ /g, ' ')
const FIESTAS: readonly { clave: Fiesta; texto: string }[] = [
  { clave: 'boda', texto: 'Boda' },
  { clave: 'xv', texto: 'XV años' },
  { clave: 'cumple', texto: 'Cumpleaños' },
]

const INICIAL: CotizacionState = { status: 'idle' }

/**
 * **El cotizador**: lo que un planner arma en una llamada —fiesta, plan, diseño, extras y un
 * precio con su descuento— y el enlace de pago que se manda por WhatsApp. El resumen se
 * recalcula mientras se elige; el servidor vuelve a comprobar el precio, los extras y el plan.
 *
 * Si la fecha elegida ya tiene tantos eventos como la agenda aguanta, lo dice antes de cotizar.
 */
export function Cotizador({
  consulta,
  planes,
  modelos,
  extras,
  ocupacion,
  capacidad,
  hoy,
}: {
  consulta: { readonly id: string; readonly nombre: string; readonly contacto: string; readonly fecha: string | null; readonly fiesta: Fiesta | null } | null
  planes: readonly PlanCotizable[]
  modelos: readonly ModeloCotizable[]
  extras: readonly ExtraCotizable[]
  /** Cuántos eventos hay ya cada día (`YYYY-MM-DD`). */
  ocupacion: Readonly<Record<string, number>>
  capacidad: number
  hoy: string
  /** Adónde vuelve al cerrar: lo pone el panel lateral que lo envuelve. */
  cerrarHref?: string
}) {
  const [estado, accion] = useActionState(sinCaerse(cotizarAction), INICIAL)
  const [fiesta, setFiesta] = useState<Fiesta>(consulta?.fiesta ?? 'boda')
  const [plan, setPlan] = useState(planes[1]?.slug ?? planes[0]?.slug ?? '')
  const [elegidos, setElegidos] = useState<readonly string[]>([])
  const [fecha, setFecha] = useState(consulta?.fecha ?? '')
  const [precioEscrito, setPrecioEscrito] = useState<string | null>(null)
  const id = useId()

  const elPlan = planes.find((p) => p.slug === plan)
  const sumaExtras = extras.filter((x) => elegidos.includes(x.slug)).reduce((s, x) => s + x.priceCents, 0)
  const lista = (elPlan?.priceCents ?? 0) + sumaExtras
  const escrito = precioEscrito === null ? null : Math.round(Number(precioEscrito.replace(',', '.')) * 100)
  const final = escrito !== null && Number.isFinite(escrito) && escrito > 0 ? escrito : lista
  const descuento = lista - final
  // La misma regla que el `insert` de la cotización (`drizzle-order-repository.ts`): la reserva fija
  // si es menor que el total; si no, el porcentaje redondeado al boliviano.
  const reservaFija = elPlan !== undefined && elPlan.depositFixedCents !== null && elPlan.depositFixedCents < final ? elPlan.depositFixedCents : null
  const anticipo =
    reservaFija ?? (elPlan !== undefined && elPlan.depositPct > 0 && elPlan.depositPct < 100 ? Math.round((final * elPlan.depositPct) / 10000) * 100 : null)
  const modelosDeFiesta = useMemo(() => modelos.filter((m) => m.fiesta === fiesta), [modelos, fiesta])
  const ocupados = fecha === '' ? 0 : (ocupacion[fecha] ?? 0)

  // «Enviar por WhatsApp»: la pestaña abierta en el clic recibe el mensaje en cuanto la cotización existe.
  const ventana = useRef<Window | null>(null)
  useEffect(() => {
    const v = ventana.current
    if (v === null) return
    if (estado.status === 'success' && estado.whatsapp !== null) v.location.href = estado.whatsapp
    else if (estado.status !== 'idle') v.close()
    ventana.current = null
  }, [estado])

  if (estado.status === 'success') {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3 rounded-[18px] border border-sage/30 bg-pill-ok px-5 py-4 text-pill-ok-ink">
          <CheckIcon className="size-5 shrink-0" />
          <p className="text-[14px]">
            Cotización <b className="font-codigo font-medium">{estado.ref}</b> lista. Mándasela y, cuando pague, llega a «Por revisar».
          </p>
        </div>
        <div className="rounded-[16px] border border-line-panel bg-white px-4 py-3.5 text-[13px] leading-relaxed text-ink-soft">{estado.mensaje}</div>
        <div className="flex flex-wrap gap-2.5">
          {estado.whatsapp === null ? null : (
            <PanelButton external href={estado.whatsapp} variant="primary">
              <WhatsAppIcon className="size-4" /> Enviar por WhatsApp
            </PanelButton>
          )}
          <div className="rounded-full border border-line-panel-strong bg-white">
            <Copiar texto={estado.mensaje}>Copiar el mensaje</Copiar>
          </div>
          <div className="rounded-full border border-line-panel-strong bg-white">
            <Copiar texto={estado.enlace}>Copiar el enlace</Copiar>
          </div>
        </div>
        <Link className="text-[13px] text-ink underline underline-offset-4" href={`/panel/admin/ventas?venta=p-${estado.ref}`} scroll={false}>
          Ver la venta
        </Link>
      </div>
    )
  }

  return (
    // La maqueta (E52): quién y cuándo en dos columnas, el plan, los extras con su precio, el total grande y abajo
    // «Guardar sin enviar» o «Enviar por WhatsApp» (la pestaña se abre en el clic: tras la espera, Safari la bloquea).
    <form action={accion} className="flex flex-col gap-5">
      {consulta === null ? null : <input name="consultaId" type="hidden" value={consulta.id} />}
      <input name="precio" type="hidden" value={String(final / 100)} />

      <div className="grid gap-4 min-[480px]:grid-cols-2">
        <Campo etiqueta="Cliente" id={`${id}-n`}>
          <input className={FIELD_CLASS} defaultValue={consulta?.nombre ?? ''} id={`${id}-n`} maxLength={160} name="nombre" placeholder="Carla y Diego" required />
        </Campo>
        <Campo etiqueta="WhatsApp" id={`${id}-c`}>
          <input className={FIELD_CLASS} defaultValue={consulta?.contacto ?? ''} id={`${id}-c`} maxLength={160} name="contacto" placeholder="+591 70000000" required />
        </Campo>
        <Campo etiqueta="Fiesta" id={`${id}-fi`}>
          <select className={FIELD_CLASS} id={`${id}-fi`} name="fiesta" onChange={(e) => setFiesta(e.target.value as Fiesta)} value={fiesta}>
            {FIESTAS.map((f) => (
              <option key={f.clave} value={f.clave}>
                {f.texto}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Fecha del evento" id={`${id}-f`}>
          <CampoFecha hoy={hoy} id={`${id}-f`} name="fecha" onChange={setFecha} valor={fecha} />
        </Campo>
      </div>
      {ocupados >= capacidad ? (
        <p className="rounded-[12px] bg-pill-pending px-4 py-3 text-[14px] text-pill-pending-ink" role="status">
          Ese día ya tienes {ocupados} {ocupados === 1 ? 'evento' : 'eventos'}: tu agenda aguanta {capacidad}. Confírmalo antes de cotizar.
        </p>
      ) : ocupados > 0 ? (
        <p className="text-[13px] text-ink-mute">Ese día ya tienes {ocupados} {ocupados === 1 ? 'evento' : 'eventos'}.</p>
      ) : null}

      <div className="grid gap-4 min-[480px]:grid-cols-2">
        <Campo etiqueta="Plan" id={`${id}-pl`}>
          <select className={FIELD_CLASS} id={`${id}-pl`} name="plan" onChange={(e) => setPlan(e.target.value)} required value={plan}>
            {planes.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.nombre}, {bs(p.priceCents).replace(/,00$/, '')}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Diseño sugerido (opcional)" id={`${id}-m`}>
          <select className={FIELD_CLASS} defaultValue="" id={`${id}-m`} key={fiesta} name="modelo">
            <option value="">Lo elige después</option>
            {modelosDeFiesta.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      {extras.length === 0 ? null : (
        <fieldset className="flex flex-col">
          <legend className={`${LABEL_CLASS} mb-1.5`}>Extras</legend>
          {extras.map((x) => (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1.5 text-[15px]" key={x.slug}>
              <input
                checked={elegidos.includes(x.slug)}
                className="size-5 shrink-0 accent-shell-deep"
                name="extras"
                onChange={(e) => {
                  const marcado = e.target.checked
                  setElegidos((antes) => (marcado ? [...antes, x.slug] : antes.filter((s) => s !== x.slug)))
                }}
                type="checkbox"
                value={x.slug}
              />
              <span className="min-w-0 flex-1">{x.name}</span>
              <span className="shrink-0 text-ink-mute [font-variant-numeric:tabular-nums]">{bs(x.priceCents).replace(/,00$/, '')}</span>
            </label>
          ))}
        </fieldset>
      )}

      <div className="flex flex-col gap-2 rounded-[14px] border border-line-panel bg-bg-raised px-4.5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[15px]">Total</span>
          <span className="font-display text-[34px] leading-none font-medium [font-variant-numeric:lining-nums]">{bs(final).replace(/,00$/, '')}</span>
        </div>
        {descuento > 0 ? <Linea etiqueta="Descuento" tono="ok" valor={`− ${bs(descuento)}`} /> : null}
        {descuento < 0 ? <Linea etiqueta="Por encima de lista" tono="no" valor={bs(-descuento)} /> : null}
        {anticipo === null ? null : <Linea etiqueta={reservaFija !== null ? 'Reserva' : `Anticipo para reservar (${elPlan?.depositPct} %)`} valor={bs(anticipo)} />}
        {/* El precio especial, plegado: casi siempre se cobra el de lista. */}
        <details className="group text-[14px]" open={precioEscrito !== null}>
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center font-medium text-gold-deep [&::-webkit-details-marker]:hidden">
            {precioEscrito === null ? 'Cambiar el precio' : 'Precio especial'}
          </summary>
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[14px] text-ink-mute">Bs</span>
              <input
                aria-label="Precio final"
                className={`${FIELD_CLASS} pl-10`}
                inputMode="decimal"
                onChange={(e) => setPrecioEscrito(e.target.value.trim() === '' ? null : e.target.value)}
                value={precioEscrito ?? String(lista / 100)}
              />
            </div>
            <PanelButton disabled={precioEscrito === null} onClick={() => setPrecioEscrito(null)}>
              Precio de lista
            </PanelButton>
          </div>
        </details>
      </div>

      <Campo etiqueta="Nota para el cliente (opcional)" id={`${id}-nota`}>
        <textarea className={`${FIELD_CLASS} min-h-24`} id={`${id}-nota`} maxLength={1000} name="nota" placeholder="Incluye la sesión de fotos de la portada." />
      </Campo>

      {estado.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {estado.message}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2.5 border-t border-line-panel pt-5 max-[767px]:flex-col-reverse max-[767px]:items-stretch">
        <SubmitButton pendingLabel="Guardando…" variant="default">
          Guardar sin enviar
        </SubmitButton>
        <button
          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-whatsapp px-4.5 text-[14.5px] font-medium text-white transition-colors hover:bg-whatsapp-hover"
          onClick={() => {
            // Síncrono en el clic; la dirección se pone al volver la cotización.
            ventana.current = window.open('', '_blank')
          }}
          type="submit"
        >
          <WhatsAppIcon className="size-4" /> Enviar por WhatsApp
        </button>
      </div>
    </form>
  )
}

function Campo({ etiqueta, id, children }: { etiqueta: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className={LABEL_CLASS} htmlFor={id}>
        {etiqueta}
      </label>
      {children}
    </div>
  )
}

function Linea({ etiqueta, valor, tono }: { etiqueta: string; valor: string; tono?: 'ok' | 'no' }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-soft">{etiqueta}</dt>
      <dd className={`font-mono text-[12.5px] ${tono === 'ok' ? 'text-ok-deep' : tono === 'no' ? 'text-danger-deep' : 'text-ink'}`}>{valor}</dd>
    </div>
  )
}
