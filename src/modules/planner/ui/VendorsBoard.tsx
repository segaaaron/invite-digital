'use client'

import { BuildingIcon } from '@/shared/design/ui/icons'
import { CampoHora } from '@/shared/design/ui/panel/campos-de-fecha'
import { useActionState, useId } from 'react'
import { FIELD_CLASS, Field, PanelAlert, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { type DiaActionState, emitVendorLinkAction, removeVendorAction, revokeVendorLinkAction, saveVendorAction, setVendorStatusAction } from '@/app/_acciones/planner/dia-actions'
import { ESTADOS_DE_PROVEEDOR, type EstadoDeProveedor, NOMBRE_DE_ESTADO } from '../domain/equipo-del-dia'
import { Accion, type Evento, Ocultos } from './Accion'
import { ActionFeedback, SubmitButton, EmptyState } from '@/shared/design/ui/panel/estados'

const INICIAL: DiaActionState = { status: 'idle' }

export type ProveedorVista = {
  readonly id: string
  readonly service: string
  readonly company: string | null
  readonly contactName: string | null
  readonly whatsapp: string | null
  readonly email: string | null
  readonly status: EstadoDeProveedor
  readonly arrivalTime: string | null
  readonly setupNotes: string | null
  readonly conEnlace: boolean
  /** WhatsApp en un toque, ya compuesto por la página. */
  readonly whatsappHref: string | null
  /** Lo que dice su partida: precio, pagado y lo que falta, ya formateado. */
  readonly dinero: { precio: string; pagado: string; falta: string; campoPrecio: string } | null
}

type Categoria = { clave: string; nombre: string }

const TONO: Record<EstadoDeProveedor, 'pending' | 'maybe' | 'ok'> = { cotizando: 'pending', reservado: 'maybe', contratado: 'maybe', confirmado: 'ok' }

function FormularioDeProveedor({ evento, categorias, proveedor }: { evento: Evento; categorias: readonly Categoria[]; proveedor?: ProveedorVista }) {
  const [estado, enviar, enviando] = useActionState(saveVendorAction, INICIAL)
  const id = useId()
  const e = estado.status === 'error' ? estado.valores : undefined
  const v = (campo: string, base: string | null | undefined) => e?.[campo] ?? base ?? ''
  return (
    <form action={enviar} className="flex flex-col gap-3" key={e ? JSON.stringify(e) : 'base'}>
      <Ocultos {...evento} extra={{ vendorId: proveedor?.id ?? '' }} />
      <div className="grid gap-3 min-[560px]:grid-cols-2">
        <Field htmlFor={`${id}-s`} label="Servicio">
          <input className={FIELD_CLASS} defaultValue={v('service', proveedor?.service)} id={`${id}-s`} maxLength={80} name="service" placeholder="DJ, fotógrafo, catering…" required />
        </Field>
        <Field htmlFor={`${id}-c`} label="Empresa">
          <input className={FIELD_CLASS} defaultValue={v('company', proveedor?.company)} id={`${id}-c`} maxLength={120} name="company" />
        </Field>
        <Field htmlFor={`${id}-n`} label="Contacto">
          <input className={FIELD_CLASS} defaultValue={v('contactName', proveedor?.contactName)} id={`${id}-n`} maxLength={120} name="contactName" />
        </Field>
        <Field htmlFor={`${id}-w`} label="WhatsApp">
          <input className={FIELD_CLASS} defaultValue={v('whatsapp', proveedor?.whatsapp)} id={`${id}-w`} inputMode="tel" name="whatsapp" />
        </Field>
        <Field htmlFor={`${id}-m`} label="Correo">
          <input className={FIELD_CLASS} defaultValue={v('email', proveedor?.email)} id={`${id}-m`} name="email" type="email" />
        </Field>
        <Field htmlFor={`${id}-e`} label="Estado">
          <select className={FIELD_CLASS} defaultValue={v('status', proveedor?.status ?? 'cotizando')} id={`${id}-e`} name="status">
            {ESTADOS_DE_PROVEEDOR.map((x) => (
              <option key={x} value={x}>
                {NOMBRE_DE_ESTADO[x]}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor={`${id}-p`} label="Precio (Bs) · crea su partida">
          <input className={FIELD_CLASS} defaultValue={v('price', proveedor?.dinero?.campoPrecio)} id={`${id}-p`} inputMode="decimal" name="price" placeholder="3500" />
        </Field>
        <Field htmlFor={`${id}-k`} label="Categoría del presupuesto">
          <select className={FIELD_CLASS} defaultValue={v('category', 'otros')} id={`${id}-k`} name="category">
            {categorias.map((c) => (
              <option key={c.clave} value={c.clave}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor={`${id}-h`} label="Llega el día a las">
          <CampoHora defaultValue={v('arrivalTime', proveedor?.arrivalTime)} id={`${id}-h`} name="arrivalTime" />
        </Field>
      </div>
      <Field htmlFor={`${id}-o`} label="Montaje y acceso">
        <textarea className={FIELD_CLASS} defaultValue={v('setupNotes', proveedor?.setupNotes)} id={`${id}-o`} maxLength={2000} name="setupNotes" rows={2} />
      </Field>
      <ActionFeedback errorsOnly state={estado} />
      {estado.status === 'success' ? <PanelAlert tone="ok">Proveedor guardado.</PanelAlert> : null}
      <div>
        <SubmitButton variant={proveedor ? 'default' : 'primary'} pending={enviando} pendingLabel={'Guardando…'}>{proveedor ? 'Guardar proveedor' : 'Sumar proveedor'}</SubmitButton>
      </div>
    </form>
  )
}

export function NewVendorForm(props: { evento: Evento; categorias: readonly Categoria[] }) {
  return <FormularioDeProveedor {...props} />
}

function EnlaceDeProveedor({ evento, proveedor, incluido }: { evento: Evento; proveedor: ProveedorVista; incluido: boolean }) {
  const [estado, emitir, emitiendo] = useActionState(emitVendorLinkAction, INICIAL)
  if (!incluido) return <p className="text-[11px] text-ink-mute">Los enlaces para proveedores vienen con Alta Costura.</p>
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start gap-2">
        <form action={emitir}>
          <Ocultos {...evento} extra={{ vendorId: proveedor.id }} />
          <PanelButton aria-label={`${proveedor.conEnlace ? 'Cambiar' : 'Crear'} el enlace de ${proveedor.service}`} disabled={emitiendo} type="submit">
            {proveedor.conEnlace ? 'Cambiar enlace' : 'Crear enlace de solo lectura'}
          </PanelButton>
        </form>
        {proveedor.conEnlace ? (
          <Accion action={revokeVendorLinkAction} evento={evento} extra={{ vendorId: proveedor.id }} label={`Quitar el enlace de ${proveedor.service}`} variant="danger">
            Quitar enlace
          </Accion>
        ) : null}
      </div>
      {estado.status === 'success' && estado.enlace ? (
        <div className="flex flex-col gap-1 rounded-[12px] border border-line-panel bg-bg-raised p-3">
          <span className="text-[11px] text-ink-mute">Cópialo ahora: no se vuelve a mostrar. Cambiarlo deja sin efecto el anterior.</span>
          <code className="text-[12px] break-all text-ink" aria-label="Enlace del proveedor">
            {estado.enlace}
          </code>
        </div>
      ) : null}
      <ActionFeedback errorsOnly state={estado} />
    </div>
  )
}

/** Los proveedores, con su estado, su dinero y su WhatsApp a un toque. */
export function VendorsBoard({
  evento,
  categorias,
  proveedores,
  enlacesIncluidos,
}: {
  evento: Evento
  categorias: readonly Categoria[]
  proveedores: readonly ProveedorVista[]
  enlacesIncluidos: boolean
}) {
  if (proveedores.length === 0) {
    return (
      <EmptyState
        description="Anota a cada proveedor con su precio y su hora de llegada: su pago entra al presupuesto y sus momentos al cronograma."
        icon={<BuildingIcon />}
        title="Aún no sumaste proveedores"
      />
    )
  }
  return (
    <ul className="flex flex-col gap-3">
      {proveedores.map((p) => (
        <li aria-label={p.service} className="flex flex-col gap-3 rounded-[18px] border border-line-panel bg-white px-5 py-4 shadow-card" key={p.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="font-display text-[20px] font-light text-ink">{p.service}</span>
              <span className="text-[12px] text-ink-mute">
                {[p.company, p.contactName, p.arrivalTime ? `llega ${p.arrivalTime}` : null].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
              </span>
              {p.dinero ? (
                <span className="text-[12px] text-ink-soft [font-variant-numeric:tabular-nums]">
                  {p.dinero.precio} · pagado {p.dinero.pagado} · falta {p.dinero.falta}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={TONO[p.status]}>{NOMBRE_DE_ESTADO[p.status]}</Pill>
              {p.whatsappHref ? (
                <PanelButton external href={p.whatsappHref}>
                  WhatsApp
                </PanelButton>
              ) : null}
            </div>
          </div>
          <details>
            <summary className="cursor-pointer text-[11px] text-ink-soft underline underline-offset-2">Estado, enlace, editar o quitar</summary>
            <div className="mt-3 flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {ESTADOS_DE_PROVEEDOR.filter((x) => x !== p.status).map((x) => (
                  <Accion action={setVendorStatusAction} evento={evento} extra={{ vendorId: p.id, status: x }} key={x} label={`Marcar ${p.service} como ${NOMBRE_DE_ESTADO[x].toLowerCase()}`}>
                    {NOMBRE_DE_ESTADO[x]}
                  </Accion>
                ))}
              </div>
              <EnlaceDeProveedor evento={evento} incluido={enlacesIncluidos} proveedor={p} />
              <FormularioDeProveedor categorias={categorias} evento={evento} proveedor={p} />
              <div>
                <Accion action={removeVendorAction} evento={evento} extra={{ vendorId: p.id }} label={`Quitar a ${p.service}`} variant="danger">
                  Quitar proveedor
                </Accion>
              </div>
            </div>
          </details>
        </li>
      ))}
    </ul>
  )
}
