'use client'

import Link from 'next/link'
import { useActionState, useId, useMemo, useState } from 'react'
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
  cerrarHref,
}: {
  consulta: { readonly id: string; readonly nombre: string; readonly contacto: string; readonly fecha: string | null; readonly fiesta: Fiesta | null } | null
  planes: readonly PlanCotizable[]
  modelos: readonly ModeloCotizable[]
  extras: readonly ExtraCotizable[]
  /** Cuántos eventos hay ya cada día (`YYYY-MM-DD`). */
  ocupacion: Readonly<Record<string, number>>
  capacidad: number
  hoy: string
  cerrarHref: string
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
    <form action={accion} className="flex flex-col gap-6">
      {consulta === null ? null : <input name="consultaId" type="hidden" value={consulta.id} />}

      <Seccion titulo="Para quién">
        <div className="grid gap-3 min-[480px]:grid-cols-2">
          <Campo etiqueta="Nombre" id={`${id}-n`}>
            <input className={FIELD_CLASS} defaultValue={consulta?.nombre ?? ''} id={`${id}-n`} maxLength={160} name="nombre" placeholder="Carla y Diego" required />
          </Campo>
          <Campo etiqueta="WhatsApp o correo" id={`${id}-c`}>
            <input className={FIELD_CLASS} defaultValue={consulta?.contacto ?? ''} id={`${id}-c`} maxLength={160} name="contacto" placeholder="+591 70000000" required />
          </Campo>
        </div>
        <div className="grid gap-3 min-[480px]:grid-cols-2">
          <fieldset className="flex flex-col gap-2">
            <legend className={`${LABEL_CLASS} mb-2`}>Fiesta</legend>
            <div className="flex rounded-full border border-line-panel bg-white p-1">
              {FIESTAS.map((f) => (
                <label className="flex-1 cursor-pointer rounded-full px-3 py-1.5 text-center text-[12.5px] text-ink-soft transition-colors has-[:checked]:bg-ink has-[:checked]:text-white" key={f.clave}>
                  <input checked={fiesta === f.clave} className="sr-only" name="fiesta" onChange={() => setFiesta(f.clave)} type="radio" value={f.clave} />
                  {f.texto}
                </label>
              ))}
            </div>
          </fieldset>
          <Campo etiqueta="Fecha del evento" id={`${id}-f`}>
            <CampoFecha hoy={hoy} id={`${id}-f`} name="fecha" onChange={setFecha} valor={fecha} />
          </Campo>
        </div>
        {ocupados >= capacidad ? (
          <p className="rounded-[12px] border border-warn/40 bg-warn/10 px-4 py-2.5 text-[12.5px] text-warn-deep" role="status">
            Ese día ya tienes {ocupados} {ocupados === 1 ? 'evento' : 'eventos'}: tu agenda aguanta {capacidad}. Confírmalo antes de cotizar.
          </p>
        ) : ocupados > 0 ? (
          <p className="text-[12px] text-ink-mute">Ese día ya tienes {ocupados} {ocupados === 1 ? 'evento' : 'eventos'}.</p>
        ) : null}
      </Seccion>

      <Seccion titulo="Qué se lleva">
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Plan</legend>
          <div className="grid gap-2 min-[520px]:grid-cols-3">
            {planes.map((p) => (
              <label
                className="flex cursor-pointer flex-col gap-1 rounded-[16px] border border-line-panel bg-white px-4 py-3 transition-[border-color,box-shadow] has-[:checked]:border-ink has-[:checked]:shadow-float"
                key={p.slug}
              >
                <input checked={plan === p.slug} className="sr-only" name="plan" onChange={() => setPlan(p.slug)} required type="radio" value={p.slug} />
                <span className="font-display text-[18px] leading-tight text-ink">{p.nombre}</span>
                <span className="font-mono text-[11px] text-ink-mute">{bs(p.priceCents)}</span>
                {p.depositFixedCents !== null ? (
                  <span className="text-[11px] text-ink-mute">Reserva {bs(p.depositFixedCents)}</span>
                ) : p.depositPct > 0 && p.depositPct < 100 ? (
                  <span className="text-[11px] text-ink-mute">Anticipo {p.depositPct} %</span>
                ) : null}
              </label>
            ))}
          </div>
        </fieldset>
        <Campo etiqueta="Diseño sugerido · opcional" id={`${id}-m`}>
          <select className={FIELD_CLASS} defaultValue="" id={`${id}-m`} key={fiesta} name="modelo">
            <option value="">Lo elige después</option>
            {modelosDeFiesta.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </Campo>
        {extras.length === 0 ? null : (
          <fieldset className="flex flex-col gap-2">
            <legend className={`${LABEL_CLASS} mb-2`}>Extras</legend>
            <div className="grid gap-2 min-[480px]:grid-cols-2">
              {extras.map((x) => (
                <label
                  className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-line-panel bg-white px-3.5 py-2.5 transition-colors has-[:checked]:border-ink has-[:checked]:bg-bg-sunken/50"
                  key={x.slug}
                >
                  <input
                    checked={elegidos.includes(x.slug)}
                    className="mt-1 accent-ink"
                    name="extras"
                    onChange={(e) => {
                      const marcado = e.target.checked
                      setElegidos((antes) => (marcado ? [...antes, x.slug] : antes.filter((s) => s !== x.slug)))
                    }}
                    type="checkbox"
                    value={x.slug}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] text-ink">{x.name}</span>
                    <span className="block text-[11.5px] text-ink-mute">{x.que}</span>
                  </span>
                  <span className="font-mono text-[11px] text-ink-soft">{bs(x.priceCents)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </Seccion>

      <Seccion titulo="Precio">
        <div className="grid items-end gap-4 min-[480px]:grid-cols-[1fr_auto]">
          <Campo etiqueta="Precio final" id={`${id}-p`}>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-mono text-[12px] text-ink-mute">Bs</span>
              <input
                className={`${FIELD_CLASS} pl-11 font-display text-[20px] [font-variant-numeric:lining-nums]`}
                id={`${id}-p`}
                inputMode="decimal"
                name="precio"
                onChange={(e) => setPrecioEscrito(e.target.value.trim() === '' ? null : e.target.value)}
                required
                value={precioEscrito ?? String(lista / 100)}
              />
            </div>
          </Campo>
          <PanelButton disabled={precioEscrito === null} onClick={() => setPrecioEscrito(null)}>
            Precio de lista
          </PanelButton>
        </div>
        <dl className="flex flex-col gap-1.5 rounded-[16px] border border-line-panel bg-bg-sunken/40 px-4 py-3.5 text-[13px]">
          <Linea etiqueta={`Plan ${elPlan?.nombre ?? ''}`} valor={bs(elPlan?.priceCents ?? 0)} />
          {sumaExtras === 0 ? null : <Linea etiqueta="Extras" valor={bs(sumaExtras)} />}
          {descuento > 0 ? <Linea etiqueta="Descuento" tono="ok" valor={`− ${bs(descuento)}`} /> : null}
          {descuento < 0 ? <Linea etiqueta="Por encima de lista" tono="no" valor={bs(-descuento)} /> : null}
          <div className="mt-1.5 flex items-baseline justify-between border-t border-line-panel pt-2.5">
            <dt className="font-mono text-[10px] tracking-[0.16em] text-ink-mute uppercase">Total</dt>
            <dd className="font-display text-[26px] leading-none text-ink [font-variant-numeric:lining-nums]">{bs(final)}</dd>
          </div>
          {anticipo === null ? null : <Linea etiqueta={reservaFija !== null ? 'Reserva' : `Anticipo para reservar (${elPlan?.depositPct} %)`} valor={bs(anticipo)} />}
        </dl>
      </Seccion>

      <Campo etiqueta="Nota para el cliente · opcional" id={`${id}-nota`}>
        <textarea className={`${FIELD_CLASS} min-h-20`} id={`${id}-nota`} maxLength={1000} name="nota" placeholder="Incluye la sesión de fotos de la portada." />
      </Campo>

      {estado.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {estado.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2.5">
        <SubmitButton pendingLabel="Creando…">Crear la cotización</SubmitButton>
        <PanelButton href={cerrarHref}>Cancelar</PanelButton>
      </div>
    </form>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-display text-[20px] leading-tight text-ink italic">{titulo}</h3>
      {children}
    </section>
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
