'use client'

import Link from 'next/link'
import { BuildingIcon, PhoneIcon, WhatsAppIcon } from '@/shared/design/ui/icons'
import { CampoHora } from '@/shared/design/ui/panel/campos-de-fecha'
import { useActionState, useId } from 'react'
import { FIELD_CLASS, Field, PanelAlert, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { type DiaActionState, emitVendorLinkAction, removeVendorAction, revokeVendorLinkAction, saveVendorAction, setVendorStatusAction } from '@/app/_acciones/planner/dia-actions'
import { ESTADOS_DE_PROVEEDOR, type EstadoDeProveedor, NOMBRE_DE_ESTADO } from '../domain/equipo-del-dia'
import { Accion, type Evento, Ocultos } from './Accion'
import { ActionFeedback, SubmitButton, EmptyState } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'
import { traducir } from '@/shared/i18n/en-ingles'

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
  const t = useT()
  const [estado, enviar, enviando] = useActionState(sinCaerse(saveVendorAction), INICIAL)
  const id = useId()
  const e = estado.status === 'error' ? estado.valores : undefined
  const v = (campo: string, base: string | null | undefined) => e?.[campo] ?? base ?? ''
  return (
    <form action={enviar} className="flex flex-col gap-3" key={e ? JSON.stringify(e) : 'base'}>
      <Ocultos {...evento} extra={{ vendorId: proveedor?.id ?? '' }} />
      <div className="grid gap-3 min-[560px]:grid-cols-2">
        <Field htmlFor={`${id}-s`} label={t('Servicio', 'Service')}>
          <input className={FIELD_CLASS} defaultValue={v('service', proveedor?.service)} id={`${id}-s`} maxLength={80} name="service" placeholder={t('DJ, fotógrafo, catering…', 'DJ, photographer, catering…')} required />
        </Field>
        <Field htmlFor={`${id}-c`} label={t('Empresa', 'Company')}>
          <input className={FIELD_CLASS} defaultValue={v('company', proveedor?.company)} id={`${id}-c`} maxLength={120} name="company" />
        </Field>
        <Field htmlFor={`${id}-n`} label={t('Contacto', 'Contact')}>
          <input className={FIELD_CLASS} defaultValue={v('contactName', proveedor?.contactName)} id={`${id}-n`} maxLength={120} name="contactName" />
        </Field>
        <Field htmlFor={`${id}-w`} label="WhatsApp">
          <input className={FIELD_CLASS} defaultValue={v('whatsapp', proveedor?.whatsapp)} id={`${id}-w`} inputMode="tel" name="whatsapp" />
        </Field>
        <Field htmlFor={`${id}-m`} label={t('Correo', 'Email')}>
          <input className={FIELD_CLASS} defaultValue={v('email', proveedor?.email)} id={`${id}-m`} name="email" type="email" />
        </Field>
        <Field htmlFor={`${id}-e`} label={t('Estado', 'Status')}>
          <select className={FIELD_CLASS} defaultValue={v('status', proveedor?.status ?? 'cotizando')} id={`${id}-e`} name="status">
            {ESTADOS_DE_PROVEEDOR.map((x) => (
              <option key={x} value={x}>
                {traducir(NOMBRE_DE_ESTADO[x], t)}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor={`${id}-p`} label={t('Precio (Bs) · crea su partida', 'Price (Bs) · creates its line item')}>
          <input className={FIELD_CLASS} defaultValue={v('price', proveedor?.dinero?.campoPrecio)} id={`${id}-p`} inputMode="decimal" name="price" placeholder="3500" />
        </Field>
        <Field htmlFor={`${id}-k`} label={t('Categoría del presupuesto', 'Budget category')}>
          <select className={FIELD_CLASS} defaultValue={v('category', 'otros')} id={`${id}-k`} name="category">
            {categorias.map((c) => (
              <option key={c.clave} value={c.clave}>
                {traducir(c.nombre, t)}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor={`${id}-h`} label={t('Llega el día a las', 'Arrives on the day at')}>
          <CampoHora defaultValue={v('arrivalTime', proveedor?.arrivalTime)} id={`${id}-h`} name="arrivalTime" />
        </Field>
      </div>
      <Field htmlFor={`${id}-o`} label={t('Montaje y acceso', 'Setup and access')}>
        <textarea className={FIELD_CLASS} defaultValue={v('setupNotes', proveedor?.setupNotes)} id={`${id}-o`} maxLength={2000} name="setupNotes" rows={2} />
      </Field>
      <ActionFeedback errorsOnly state={estado} />
      {estado.status === 'success' ? <PanelAlert tone="ok">{t('Proveedor guardado.', 'Vendor saved.')}</PanelAlert> : null}
      <div>
        <SubmitButton variant={proveedor ? 'default' : 'primary'} pending={enviando} pendingLabel={t('Guardando…', 'Saving…')}>{proveedor ? t('Guardar proveedor', 'Save vendor') : t('Sumar proveedor', 'Add vendor')}</SubmitButton>
      </div>
    </form>
  )
}

export function NewVendorForm(props: { evento: Evento; categorias: readonly Categoria[] }) {
  return <FormularioDeProveedor {...props} />
}

function EnlaceDeProveedor({ evento, proveedor, incluido }: { evento: Evento; proveedor: ProveedorVista; incluido: boolean }) {
  const t = useT()
  const [estado, emitir, emitiendo] = useActionState(sinCaerse(emitVendorLinkAction), INICIAL)
  if (!incluido) return <p className="text-[12px] text-ink-mute">{t('Los enlaces para proveedores vienen con Imperial.', 'Vendor links come with Imperial.')}</p>
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start gap-2">
        <form action={emitir}>
          <Ocultos {...evento} extra={{ vendorId: proveedor.id }} />
          <PanelButton aria-label={proveedor.conEnlace ? t(`Cambiar el enlace de ${proveedor.service}`, `Change ${proveedor.service}’s link`) : t(`Crear el enlace de ${proveedor.service}`, `Create ${proveedor.service}’s link`)} disabled={emitiendo} type="submit">
            {proveedor.conEnlace ? t('Cambiar enlace', 'Change link') : t('Crear enlace de solo lectura', 'Create read-only link')}
          </PanelButton>
        </form>
        {proveedor.conEnlace ? (
          <Accion action={revokeVendorLinkAction} evento={evento} extra={{ vendorId: proveedor.id }} label={t(`Quitar el enlace de ${proveedor.service}`, `Remove ${proveedor.service}’s link`)} variant="danger">
            {t('Quitar enlace', 'Remove link')}
          </Accion>
        ) : null}
      </div>
      {estado.status === 'success' && estado.enlace ? (
        <div className="flex flex-col gap-1 rounded-[12px] border border-line-panel bg-bg-raised p-3">
          <span className="text-[12px] text-ink-mute">{t('Cópialo ahora: no se vuelve a mostrar. Cambiarlo deja sin efecto el anterior.', 'Copy it now: it won’t be shown again. Changing it voids the previous one.')}</span>
          <code className="text-[12px] break-all text-ink" aria-label={t('Enlace del proveedor', 'Vendor link')}>
            {estado.enlace}
          </code>
        </div>
      ) : null}
      <ActionFeedback errorsOnly state={estado} />
    </div>
  )
}

/** «Editar proveedor» (diálogo): su estado de un toque, sus datos y quitarlo. */
export function EditarProveedor({ evento, categorias, proveedor }: { evento: Evento; categorias: readonly Categoria[]; proveedor: ProveedorVista }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {ESTADOS_DE_PROVEEDOR.filter((x) => x !== proveedor.status).map((x) => (
          <Accion action={setVendorStatusAction} evento={evento} extra={{ vendorId: proveedor.id, status: x }} key={x} label={t(`Marcar ${proveedor.service} como ${traducir(NOMBRE_DE_ESTADO[x], t).toLowerCase()}`, `Mark ${proveedor.service} as ${traducir(NOMBRE_DE_ESTADO[x], t).toLowerCase()}`)}>
            {traducir(NOMBRE_DE_ESTADO[x], t)}
          </Accion>
        ))}
      </div>
      <FormularioDeProveedor categorias={categorias} evento={evento} proveedor={proveedor} />
      <div className="border-t border-line-panel pt-4">
        <Accion action={removeVendorAction} evento={evento} extra={{ vendorId: proveedor.id }} label={t(`Quitar a ${proveedor.service}`, `Remove ${proveedor.service}`)} variant="danger">
          {t('Quitar proveedor', 'Remove vendor')}
        </Accion>
      </div>
    </div>
  )
}

/**
 * Los proveedores como tarjetas (E24): su servicio y estado, la empresa en grande, quién atiende, precio y hora de
 * llegada, llamar o escribir de un toque y compartirle su ficha del día. Tocar el nombre abre su edición.
 */
export function VendorsBoard({
  evento,
  proveedores,
  enlacesIncluidos,
  editarHref,
  nuevoHref,
}: {
  evento: Evento
  proveedores: readonly ProveedorVista[]
  enlacesIncluidos: boolean
  /** La dirección de editar sin el id: `…?proveedor=`. Una función no cruza del servidor al cliente. */
  editarHref: string
  /** Sumar el primero desde el vacío (como el resto de vacíos del panel: el siguiente paso, dentro). */
  nuevoHref?: string
}) {
  const t = useT()
  if (proveedores.length === 0) {
    return (
      <EmptyState
        action={nuevoHref === undefined ? undefined : <PanelButton href={nuevoHref} variant="primary">{t('Añadir el primer proveedor', 'Add the first vendor')}</PanelButton>}
        description={t('Anota a cada proveedor con su precio y su hora de llegada: su pago entra al presupuesto y sus momentos al cronograma.', 'Add each vendor with their price and arrival time: their payment goes into the budget and their moments into the schedule.')}
        icon={<BuildingIcon />}
        title={t('Aún no sumaste proveedores', 'You haven’t added vendors yet')}
      />
    )
  }
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] items-start gap-5">
      {proveedores.map((p) => (
        <li aria-label={p.service} className="flex flex-col rounded-[16px] border border-line-panel bg-tarjeta px-5 pt-4 pb-3" key={p.id}>
          <div className="flex items-start justify-between gap-3">
            <span className="text-[13px] text-ink-mute">{p.service}</span>
            <Pill tone={TONO[p.status]}>{traducir(NOMBRE_DE_ESTADO[p.status], t)}</Pill>
          </div>
          <Link
            aria-label={`Editar ${p.service}`}
            className="mt-1 font-display text-[24px] leading-[1.2] font-medium text-ink no-underline hover:text-gold-deep"
            href={`${editarHref}${p.id}`}
            scroll={false}
          >
            {p.company ?? p.service}
          </Link>
          <span className="mt-2 text-[14px] text-ink-mute">{[p.contactName, p.whatsapp?.replace(/^\+591(?=\d)/, '+591 ')].filter(Boolean).join(', ') || t('Sin datos de contacto', 'No contact details')}</span>
          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line-panel pt-3.5 text-[14.5px] [font-variant-numeric:tabular-nums]">
            <span>
              {p.dinero ? (
                <>
                  {t('Precio', 'Price')} <strong className="font-medium">{p.dinero.precio}</strong>
                </>
              ) : (
                <span className="text-ink-mute">{t('Sin precio', 'No price')}</span>
              )}
            </span>
            <span className="text-ink-mute">{p.arrivalTime ? t(`Llega ${p.arrivalTime}`, `Arrives ${p.arrivalTime}`) : t('Llega por confirmar', 'Arrival to be confirmed')}</span>
          </div>
          <div className="mt-3.5 flex flex-wrap gap-2">
            {p.whatsapp ? (
              <PanelButton href={`tel:${p.whatsapp}`} size="sm">
                <PhoneIcon className="size-4" /> {t('Llamar', 'Call')}
              </PanelButton>
            ) : null}
            {p.whatsappHref ? (
              <PanelButton external href={p.whatsappHref} size="sm">
                <WhatsAppIcon className="size-4" /> WhatsApp
              </PanelButton>
            ) : null}
          </div>
          <details className="mt-2">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center text-[14px] font-medium text-gold-deep hover:underline [&::-webkit-details-marker]:hidden">
              {t('Compartirle su ficha del día', 'Share their day sheet')}
            </summary>
            <div className="pt-1 pb-2">
              <EnlaceDeProveedor evento={evento} incluido={enlacesIncluidos} proveedor={p} />
            </div>
          </details>
        </li>
      ))}
    </ul>
  )
}
