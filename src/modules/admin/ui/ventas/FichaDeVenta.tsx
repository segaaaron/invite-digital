import type { ReactNode } from 'react'
import { traducir } from '@/shared/i18n/en-ingles'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'
import { contactarVentaAction, reabrirVentaAction, recordarPagoAction } from '@/app/_acciones/admin/ventas-actions'
import { OrderDecision } from '@/modules/orders'
import { etiquetaDeMotivo } from '@/modules/leads'
import { CheckIcon, WhatsAppIcon, MailIcon } from '@/shared/design/ui/icons'
import { MenuDeAcciones, opcionDeMenu } from '@/shared/design/ui/panel/lista'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { diaDelEvento, fechaHora, hace } from '@/shared/format/fecha'
import { formatAmount } from '@/shared/money'
import { eventoDeVenta, origenDe, siguientePaso, type Venta } from '../../domain/ventas'
import { AbrirYAnotar, Copiar, PerderVenta, RegistrarSaldo } from './AccionesDeVenta'

export type ComprobanteDeVenta = { readonly id: string; readonly originalName: string; readonly uploadedAt: Date }

/**
 * **La ficha de una venta**: todo lo de esa persona en un panel —su consulta, su pedido, su pago y
 * su evento— y **un solo botón principal, el siguiente paso**. Sustituye a las dos fichas que
 * había (la de la consulta y la tarjeta del pedido), que se abrían por separado.
 *
 * Los enlaces ya vienen armados del servidor (`enlaces`), con el mensaje de la plantilla dentro.
 */
export async function FichaDeVenta({
  venta: v,
  comprobantes,
  enlaces,
  diseno,
  ahora,
}: {
  venta: Venta
  comprobantes: readonly ComprobanteDeVenta[]
  enlaces: {
    readonly contactar: string | null
    readonly correo: string | null
    readonly recordar: string | null
    readonly pedido: string | null
    readonly cliente: string
    readonly crearEvento: string | null
    readonly cotizar: string
  }
  diseno: string | null
  ahora: Date
}) {
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  const p = v.pedido
  const c = v.consulta
  const moneda = (cents: number) => formatAmount(cents, 'BOB')
  const slugDelEvento = eventoDeVenta(v)
  const paso = siguientePaso(v)
  const saldo = p !== null && p.amountCents !== null && p.depositCents !== null ? p.amountCents - p.depositCents : null

  const contacto = [v.telefono, v.correo].filter((x): x is string => x !== null && x !== '')
  const cerrable = !(v.etapa === 'cerrada' || v.etapa === 'perdida' || v.etapa === 'cancelada' || v.etapa === 'saldo_pendiente' || v.etapa === 'por_crear_evento')

  return (
    <div className="flex flex-col gap-5.5">
      {/* El pago por revisar, en su caja de latón con el importe a comparar (maqueta E02). */}
      {p !== null && p.status === 'proof_submitted' ? (
        <div className="flex flex-col gap-4 rounded-[12px] bg-pill-laton p-4.5">
          <div className="flex items-center gap-5">
            <span aria-hidden className="flex h-[108px] w-[84px] shrink-0 -rotate-2 flex-col gap-1.5 rounded-[6px] border border-grab-borde bg-white p-2.5 shadow-[0_6px_14px_rgb(12_36_32/0.1)]">
              <span className="h-[7px] w-3/5 bg-shell-deep" />
              <span className="h-1 w-[90%] bg-line-panel" />
              <span className="h-1 w-[78%] bg-line-panel" />
              <span className="h-1 w-[85%] bg-line-panel" />
              <span className="mt-auto h-[7px] w-[46%] self-end bg-gold" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold">
                {t('Subió su comprobante', 'Uploaded their receipt')} {comprobantes[0] === undefined ? '' : hace(comprobantes[comprobantes.length - 1]!.uploadedAt, ahora, locale)}
              </p>
              <p className="mt-1 text-[14.5px] text-ink-soft">
                {t(
                  `Revisa que el monto${p.amountCents === null ? '' : ` (${moneda(p.depositCents ?? p.amountCents)})`} y el nombre coincidan con el pedido.`,
                  `Check that the amount${p.amountCents === null ? '' : ` (${moneda(p.depositCents ?? p.amountCents)})`} and the name match the order.`,
                )}
              </p>
            </div>
          </div>
          <ListaDeComprobantes comprobantes={comprobantes} />
        </div>
      ) : comprobantes.length > 0 ? (
        <ListaDeComprobantes comprobantes={comprobantes} />
      ) : null}

      {/* Cómo contactarle, con WhatsApp a un toque. */}
      {contacto.length === 0 && enlaces.contactar === null ? null : (
        <div className="flex flex-wrap items-center justify-between gap-3.5">
          <div className="text-[14.5px]">
            {contacto[0] ?? ''}
            {contacto[1] === undefined ? null : <div className="text-ink-mute">{contacto[1]}</div>}
          </div>
          {enlaces.contactar === null ? null : (
            <a
              className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-whatsapp px-4.5 text-[14.5px] font-medium text-white no-underline transition-colors hover:bg-whatsapp-hover"
              href={enlaces.contactar}
              rel="noopener noreferrer"
              target="_blank"
            >
              <WhatsAppIcon className="size-[18px]" /> {t('Escribir por WhatsApp', 'Write on WhatsApp')}
            </a>
          )}
        </div>
      )}

      {/* Lo que escribió y lo que pasó, plegado: la decisión va primero. */}
      <details className="group rounded-[12px] border border-line-panel">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-[14.5px] font-medium [&::-webkit-details-marker]:hidden">
          {t('Recorrido y datos', 'History and details')}
          <span aria-hidden className="text-ink-mute transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="flex flex-col gap-5 border-t border-line-panel px-4 py-4">
          <Recorrido venta={v} comprobantes={comprobantes} moneda={moneda} />
          <dl className="grid gap-4 min-[480px]:grid-cols-2">
            <Dato etiqueta={t('Qué celebra', 'Celebrating')}>{c?.categoria ? traducir(c.categoria, t) : v.fiesta === null ? '—' : { boda: t('Boda', 'Wedding'), xv: t('XV años', 'Quinceañera'), cumple: t('Cumpleaños', 'Birthday') }[v.fiesta]}</Dato>
            <Dato etiqueta={t('Fecha del evento', 'Event date')}>{v.fechaEvento === null ? '—' : diaDelEvento(v.fechaEvento, locale)}</Dato>
            <Dato etiqueta={t('Teléfono', 'Phone')}>{v.telefono ?? '—'}</Dato>
            <Dato etiqueta={t('Correo', 'Email')}>{v.correo ?? '—'}</Dato>
            {p === null ? null : <Dato etiqueta={p.esExtra ? 'Extra' : 'Plan'}>{p.producto}</Dato>}
            {p === null || p.esExtra ? null : <Dato etiqueta={t('Diseño', 'Design')}>{diseno ?? t('Lo elige después', 'They choose later')}</Dato>}
            {c === null ? null : <Dato etiqueta={t('Llegó por', 'Came via')}>{traducir(origenDe(c.utm), t)}</Dato>}
            {p === null ? null : <Dato etiqueta={t('Referencia', 'Reference')}>{p.publicRef}</Dato>}
            {p?.depositCents === null || p === null ? null : <Dato etiqueta={t('Anticipo', 'Deposit')}>{moneda(p.depositCents)}</Dato>}
          </dl>
          {c?.message ? <p className="rounded-[10px] bg-bg px-4 py-3 text-[14px] leading-relaxed text-ink">«{c.message}»</p> : null}
          {c?.note ? <p className="text-[13px] text-ink-mute">Nota: {c.note}</p> : null}
        </div>
      </details>

      <div aria-hidden className="h-[3px] border-y border-grab-borde" />

      {/* Abajo, como en la maqueta: lo que deshace a la izquierda y el siguiente paso a la derecha. */}
      {p !== null && p.status === 'proof_submitted' ? (
        <OrderDecision correo={v.correo} esExtra={p.esExtra} nombre={v.nombre} importe={p.depositCents === null ? (p.amountCents === null ? null : moneda(p.amountCents)) : moneda(p.depositCents)} orderId={p.id} />
      ) : (
        <div className="flex flex-wrap items-center gap-3.5">
          {cerrable ? <PerderVenta consultaId={c?.id ?? null} orderId={p !== null && p.status !== 'approved' ? p.id : null} /> : null}
          <MenuDeAcciones>
            {enlaces.correo === null ? null : (
              <a className={opcionDeMenu()} href={enlaces.correo}>
                <MailIcon className="size-4" /> {t('Enviar un correo', 'Send an email')}
              </a>
            )}
            {enlaces.pedido === null ? null : (
              <>
                <Copiar texto={enlaces.pedido}>{t('Copiar el enlace de pago', 'Copy the payment link')}</Copiar>
                <a className={opcionDeMenu()} href={enlaces.pedido} rel="noopener noreferrer" target="_blank">
                  {t('Ver la página del pedido', 'See the order page')}
                </a>
              </>
            )}
            {v.etapa === 'nueva' || v.etapa === 'contactada' ? (
              <a className={opcionDeMenu()} href={enlaces.cotizar}>
                {t('Enviar una cotización', 'Send a quote')}
              </a>
            ) : null}
            {/* Cerró por fuera (efectivo, en persona): su evento se crea y la consulta queda ganada. */}
            {p === null && enlaces.crearEvento !== null ? (
              <a className={opcionDeMenu()} href={enlaces.crearEvento}>
                <CheckIcon className="size-4" /> {t('Ya cerró: crear su evento', 'Already closed: create their event')}
              </a>
            ) : null}
            <a className={opcionDeMenu()} href={enlaces.cliente}>
              {t('Ver la ficha del cliente', 'See the client’s record')}
            </a>
          </MenuDeAcciones>
          <span className="flex-1" />
          <Principal enlaces={enlaces} moneda={moneda} paso={paso} saldo={saldo} slugDelEvento={slugDelEvento} venta={v} />
        </div>
      )}
    </div>
  )
}

/** El botón del siguiente paso, según la etapa. */
async function Principal({
  venta: v,
  paso,
  enlaces,
  slugDelEvento,
  saldo,
  moneda,
}: {
  venta: Venta
  paso: string | null
  enlaces: Parameters<typeof FichaDeVenta>[0]['enlaces']
  slugDelEvento: string | null
  saldo: number | null
  moneda: (cents: number) => string
}) {
  const t = await tr()
  const p = v.pedido
  const c = v.consulta
  switch (v.etapa) {
    case 'nueva': {
      const destino = enlaces.contactar ?? enlaces.correo
      if (destino === null || c === null) return <Nota>{t('Sin teléfono ni correo: no hay cómo contestarle.', 'No phone or email: there is no way to reply.')}</Nota>
      return (
        <AbrirYAnotar accion={contactarVentaAction} campos={{ consultaId: c.id }} externo={enlaces.contactar !== null} href={destino}>
          {enlaces.contactar !== null ? <WhatsAppIcon className="size-4" /> : <MailIcon className="size-4" />} {paso}
        </AbrirYAnotar>
      )
    }
    case 'contactada':
      return (
        <PanelButton href={enlaces.cotizar} variant="primary">
          {paso}
        </PanelButton>
      )
    case 'esperando_pago':
      return p !== null && enlaces.recordar !== null ? (
        <AbrirYAnotar accion={recordarPagoAction} campos={{ orderId: p.id }} href={enlaces.recordar}>
          <WhatsAppIcon className="size-4" /> {paso}
        </AbrirYAnotar>
      ) : (
        <Nota>{t('El contacto es un correo: copia el enlace de pago desde «⋯».', 'The contact is an email: copy the payment link from “⋯”.')}</Nota>
      )
    case 'por_revisar':
      return <Nota>{t('Revisa el comprobante de abajo y decide.', 'Review the receipt below and decide.')}</Nota>
    case 'por_crear_evento':
      return enlaces.crearEvento === null ? null : (
        <PanelButton href={enlaces.crearEvento} variant="primary">
          {paso}
        </PanelButton>
      )
    case 'saldo_pendiente':
      return p === null || saldo === null ? null : <RegistrarSaldo nombre={v.nombre} orderId={p.id} publicRef={p.publicRef} saldo={moneda(saldo)} />
    case 'cerrada':
      return slugDelEvento === null ? (
        <Nota>{t('Venta cerrada.', 'Sale closed.')}</Nota>
      ) : (
        <PanelButton href={`/dashboard/events/${slugDelEvento}/setup`} variant="primary">
          {paso}
        </PanelButton>
      )
    case 'perdida':
      return c === null ? null : (
        <form action={reabrirVentaAction}>
          <input name="consultaId" type="hidden" value={c.id} />
          <PanelButton type="submit" variant="primary">
            {paso}
          </PanelButton>
        </form>
      )
    case 'cancelada':
      return <Nota>{t(`Pedido cancelado${p?.producto ? ` · ${p.producto}` : ''}.`, `Order cancelled${p?.producto ? ` · ${p.producto}` : ''}.`)}</Nota>
  }
}

function Nota({ children }: { children: ReactNode }) {
  return <p className="px-1 text-[13px] text-ink-soft">{children}</p>
}

/** Los hitos de la venta, en orden, con su fecha. Lo que no pasó no sale. */
async function Recorrido({ venta: v, comprobantes, moneda }: { venta: Venta; comprobantes: readonly ComprobanteDeVenta[]; moneda: (cents: number) => string }) {
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  const c = v.consulta
  const p = v.pedido
  const hitos: { cuando: Date; texto: string; tono?: 'ok' | 'no' }[] = []
  if (c !== null) hitos.push({ cuando: c.createdAt, texto: t('Escribió desde la web', 'Wrote from the website') })
  if (c?.firstContactAt) hitos.push({ cuando: c.firstContactAt, texto: t('Le contestaste', 'You replied') })
  if (p !== null) hitos.push({ cuando: p.createdAt, texto: p.origin === 'cotizacion' ? t(`Le enviaste la cotización · ${p.amountCents === null ? '' : moneda(p.amountCents)}`, `You sent the quote · ${p.amountCents === null ? '' : moneda(p.amountCents)}`) : t(`Pidió el plan ${p.producto}`, `Ordered the ${p.producto} plan`) })
  if (p?.remindedAt) hitos.push({ cuando: p.remindedAt, texto: t('Le recordaste el pago', 'You reminded them to pay') })
  for (const k of comprobantes) hitos.push({ cuando: k.uploadedAt, texto: t('Subió un comprobante', 'Uploaded a receipt') })
  if (p?.status === 'approved' && p.decidedAt) hitos.push({ cuando: p.decidedAt, texto: t('Aprobaste el pago', 'You approved the payment'), tono: 'ok' })
  if (p?.balancePaidAt) hitos.push({ cuando: p.balancePaidAt, texto: t('Registraste el saldo', 'You recorded the balance'), tono: 'ok' })
  if (p?.status === 'cancelled' && p.decidedAt) hitos.push({ cuando: p.decidedAt, texto: t('Cancelaste el pedido', 'You cancelled the order'), tono: 'no' })
  if (c?.status === 'won' && c.statusChangedAt && p === null) hitos.push({ cuando: c.statusChangedAt, texto: t('Cerró la venta: evento creado', 'Sale closed: event created'), tono: 'ok' })
  if (c?.status === 'lost' && c.statusChangedAt) hitos.push({ cuando: c.statusChangedAt, texto: `${t('Perdida', 'Lost')} · ${traducir(etiquetaDeMotivo(c.lostReason) ?? 'sin motivo', t)}`, tono: 'no' })
  hitos.sort((a, b) => a.cuando.getTime() - b.cuando.getTime())

  return (
    <ol className="relative flex flex-col gap-3.5 pl-5 before:absolute before:top-1.5 before:bottom-1.5 before:left-[5px] before:w-px before:bg-line-panel-strong">
      {hitos.map((h, i) => (
        <li className="relative" key={`${h.texto}-${i}`}>
          <span
            aria-hidden
            className={`absolute top-1.5 -left-5 size-[11px] rounded-full border-2 border-bg-raised ${h.tono === 'ok' ? 'bg-sage' : h.tono === 'no' ? 'bg-danger' : i === hitos.length - 1 ? 'bg-gold' : 'bg-ink-mute/60'}`}
          />
          <p className="text-[13.5px] text-ink">{h.texto}</p>
          <p className="font-mono text-[12px] tracking-[0.08em] text-ink-mute">{fechaHora(h.cuando, locale)}</p>
        </li>
      ))}
      {v.etapa === 'por_crear_evento' ? (
        <li className="relative">
          <span aria-hidden className="absolute top-1.5 -left-5 size-[11px] rounded-full border-2 border-dashed border-gold bg-bg-raised" />
          <p className="text-[13.5px] text-ink-soft">{t('Falta crear su evento', 'Their event is still to be created')}</p>
        </li>
      ) : null}
      {eventoDeVenta(v) !== null ? (
        <li className="relative">
          <span aria-hidden className="absolute top-1.5 -left-5 flex size-[11px] items-center justify-center rounded-full bg-sage">
            <CheckIcon className="size-2 text-white" />
          </span>
          <p className="text-[13.5px] text-ink">{t('Evento creado', 'Event created')}</p>
        </li>
      ) : null}
    </ol>
  )
}

async function ListaDeComprobantes({ comprobantes }: { comprobantes: readonly ComprobanteDeVenta[] }) {
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  if (comprobantes.length === 0) return <p className="text-[12.5px] text-ink-mute">{t('Sin comprobante adjunto.', 'No receipt attached.')}</p>
  return (
    <ul className="flex flex-wrap gap-2">
      {comprobantes.map((k) => (
        <li key={k.id}>
          <a
            className="inline-flex items-center gap-2 rounded-full border border-line-panel-strong bg-white px-3.5 py-1.5 text-[12.5px] text-ink transition-colors hover:border-ink"
            href={`/dashboard/orders/receipt/${k.id}`}
          >
            {k.originalName}
            <span className="font-mono text-[12px] text-ink-mute">{fechaHora(k.uploadedAt, locale)}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

async function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[12px] font-medium tracking-[0.1em] text-ink-mute uppercase">{etiqueta}</dt>
      <dd className="text-[14px] break-words text-ink">{children}</dd>
    </div>
  )
}
