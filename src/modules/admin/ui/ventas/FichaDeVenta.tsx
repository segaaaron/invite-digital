import type { ReactNode } from 'react'
import { contactarVentaAction, reabrirVentaAction, recordarPagoAction } from '@/app/_acciones/admin/ventas-actions'
import { OrderDecision } from '@/modules/orders'
import { etiquetaDeMotivo } from '@/modules/leads'
import { CheckIcon, WhatsAppIcon, MailIcon } from '@/shared/design/ui/icons'
import { EtiquetaDeFiesta, Importe, MenuDeAcciones, Monograma, opcionDeMenu } from '@/shared/design/ui/panel/lista'
import { PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { diaDelEvento, fechaHora, hace } from '@/shared/format/fecha'
import { formatAmount } from '@/shared/money'
import { etapaDeVenta, eventoDeVenta, origenDe, siguientePaso, type Venta } from '../../domain/ventas'
import { AbrirYAnotar, Copiar, PerderVenta, RegistrarSaldo } from './AccionesDeVenta'

export type ComprobanteDeVenta = { readonly id: string; readonly originalName: string; readonly uploadedAt: Date }

/**
 * **La ficha de una venta**: todo lo de esa persona en un panel —su consulta, su pedido, su pago y
 * su evento— y **un solo botón principal, el siguiente paso**. Sustituye a las dos fichas que
 * había (la de la consulta y la tarjeta del pedido), que se abrían por separado.
 *
 * Los enlaces ya vienen armados del servidor (`enlaces`), con el mensaje de la plantilla dentro.
 */
export function FichaDeVenta({
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
  const etapa = etapaDeVenta(v.etapa)
  const p = v.pedido
  const c = v.consulta
  const moneda = (cents: number) => formatAmount(cents, 'BOB')
  const slugDelEvento = eventoDeVenta(v)
  const paso = siguientePaso(v)
  const saldo = p !== null && p.amountCents !== null && p.depositCents !== null ? p.amountCents - p.depositCents : null

  return (
    <div className="flex flex-col gap-6">
      {/* La cabecera: quién, qué fiesta, en qué etapa y cuánto vale. */}
      <div className="flex flex-wrap items-start gap-4">
        <Monograma fiesta={v.fiesta} grande nombre={v.nombre} />
        <div className="min-w-[200px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <EtiquetaDeFiesta fiesta={v.fiesta} />
            <Pill tone={etapa.tono}>{etapa.una}</Pill>
            {v.urgente ? <Pill tone="no">Urge</Pill> : null}
          </div>
          <p className="mt-2 text-[13px] text-ink-soft">
            {v.fechaEvento === null ? 'Sin fecha de evento' : `Evento el ${diaDelEvento(v.fechaEvento)}`}
            {' · '}en esta etapa {hace(v.esperaDesde, ahora)}
          </p>
        </div>
        {v.importeCents === null ? null : (
          <div className="shrink-0 text-right max-[479px]:basis-full max-[479px]:text-left">
            <Importe texto={moneda(v.importeCents)} />
            {p?.depositCents === null || p === null ? null : <p className="mt-1 text-[11.5px] text-ink-mute">Anticipo {moneda(p.depositCents)}</p>}
          </div>
        )}
      </div>

      {/* El siguiente paso, y el resto en «⋯». */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-[18px] border border-line-panel bg-white/80 p-3 shadow-card">
        <Principal enlaces={enlaces} moneda={moneda} paso={paso} saldo={saldo} slugDelEvento={slugDelEvento} venta={v} />
        <div className="ml-auto">
          <MenuDeAcciones>
            {enlaces.contactar === null ? null : (
              <a className={opcionDeMenu()} href={enlaces.contactar} rel="noopener noreferrer" target="_blank">
                <WhatsAppIcon className="size-4" /> Escribir por WhatsApp
              </a>
            )}
            {enlaces.correo === null ? null : (
              <a className={opcionDeMenu()} href={enlaces.correo}>
                <MailIcon className="size-4" /> Enviar un correo
              </a>
            )}
            {enlaces.pedido === null ? null : (
              <>
                <Copiar texto={enlaces.pedido}>Copiar el enlace de pago</Copiar>
                <a className={opcionDeMenu()} href={enlaces.pedido} rel="noopener noreferrer" target="_blank">
                  Ver la página del pedido
                </a>
              </>
            )}
            {v.etapa === 'nueva' || v.etapa === 'contactada' ? (
              <a className={opcionDeMenu()} href={enlaces.cotizar}>
                Enviar una cotización
              </a>
            ) : null}
            {/* Cerró por fuera (efectivo, en persona): su evento se crea y la consulta queda ganada. */}
            {p === null && enlaces.crearEvento !== null ? (
              <a className={opcionDeMenu()} href={enlaces.crearEvento}>
                <CheckIcon className="size-4" /> Ya cerró: crear su evento
              </a>
            ) : null}
            <a className={opcionDeMenu()} href={enlaces.cliente}>
              Ver la ficha del cliente
            </a>
          </MenuDeAcciones>
        </div>
      </div>

      {/* El pago por revisar, con el importe a comparar. */}
      {p !== null && p.status === 'proof_submitted' ? (
        <Bloque titulo="Comprobante">
          <ListaDeComprobantes comprobantes={comprobantes} />
          <div className="mt-3">
            <OrderDecision correo={v.correo} esExtra={p.esExtra} importe={p.depositCents === null ? (p.amountCents === null ? null : moneda(p.amountCents)) : moneda(p.depositCents)} orderId={p.id} />
          </div>
        </Bloque>
      ) : comprobantes.length > 0 ? (
        <Bloque titulo="Comprobantes">
          <ListaDeComprobantes comprobantes={comprobantes} />
        </Bloque>
      ) : null}

      <Bloque titulo="Recorrido">
        <Recorrido venta={v} comprobantes={comprobantes} moneda={moneda} />
      </Bloque>

      <Bloque titulo="Datos">
        <dl className="grid gap-4 min-[480px]:grid-cols-2">
          <Dato etiqueta="Qué celebra">{c?.categoria ?? (v.fiesta === null ? '—' : { boda: 'Boda', xv: 'XV años', cumple: 'Cumpleaños' }[v.fiesta])}</Dato>
          <Dato etiqueta="Fecha del evento">{v.fechaEvento === null ? '—' : diaDelEvento(v.fechaEvento)}</Dato>
          <Dato etiqueta="Teléfono">{v.telefono ?? '—'}</Dato>
          <Dato etiqueta="Correo">{v.correo ?? '—'}</Dato>
          {p === null ? null : <Dato etiqueta={p.esExtra ? 'Extra' : 'Plan'}>{p.producto}</Dato>}
          {p === null || p.esExtra ? null : <Dato etiqueta="Diseño">{diseno ?? 'Lo elige después'}</Dato>}
          {c === null ? null : <Dato etiqueta="Llegó por">{origenDe(c.utm)}</Dato>}
          {p === null ? null : <Dato etiqueta="Referencia">{p.publicRef}</Dato>}
        </dl>
        {c?.message ? <p className="mt-4 rounded-[14px] bg-bg-sunken/60 px-4 py-3 text-[13.5px] leading-relaxed text-ink">«{c.message}»</p> : null}
        {c?.note ? <p className="mt-3 text-[12.5px] text-ink-mute">Nota: {c.note}</p> : null}
      </Bloque>

      {v.etapa === 'cerrada' || v.etapa === 'perdida' || v.etapa === 'cancelada' || v.etapa === 'saldo_pendiente' || v.etapa === 'por_crear_evento' ? null : (
        <PerderVenta consultaId={c?.id ?? null} orderId={p !== null && p.status !== 'approved' ? p.id : null} />
      )}
    </div>
  )
}

/** El botón del siguiente paso, según la etapa. */
function Principal({
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
  const p = v.pedido
  const c = v.consulta
  switch (v.etapa) {
    case 'nueva': {
      const destino = enlaces.contactar ?? enlaces.correo
      if (destino === null || c === null) return <Nota>Sin teléfono ni correo: no hay cómo contestarle.</Nota>
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
        <Nota>El contacto es un correo: copia el enlace de pago desde «⋯».</Nota>
      )
    case 'por_revisar':
      return <Nota>Revisa el comprobante de abajo y decide.</Nota>
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
        <Nota>Venta cerrada.</Nota>
      ) : (
        <PanelButton href={`/panel/eventos/${slugDelEvento}/configuracion`} variant="primary">
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
      return <Nota>Pedido cancelado{p?.producto ? ` · ${p.producto}` : ''}.</Nota>
  }
}

function Nota({ children }: { children: ReactNode }) {
  return <p className="px-1 text-[13px] text-ink-soft">{children}</p>
}

/** Los hitos de la venta, en orden, con su fecha. Lo que no pasó no sale. */
function Recorrido({ venta: v, comprobantes, moneda }: { venta: Venta; comprobantes: readonly ComprobanteDeVenta[]; moneda: (cents: number) => string }) {
  const c = v.consulta
  const p = v.pedido
  const hitos: { cuando: Date; texto: string; tono?: 'ok' | 'no' }[] = []
  if (c !== null) hitos.push({ cuando: c.createdAt, texto: 'Escribió desde la web' })
  if (c?.firstContactAt) hitos.push({ cuando: c.firstContactAt, texto: 'Le contestaste' })
  if (p !== null) hitos.push({ cuando: p.createdAt, texto: p.origin === 'cotizacion' ? `Le enviaste la cotización · ${p.amountCents === null ? '' : moneda(p.amountCents)}` : `Pidió el plan ${p.producto}` })
  if (p?.remindedAt) hitos.push({ cuando: p.remindedAt, texto: 'Le recordaste el pago' })
  for (const k of comprobantes) hitos.push({ cuando: k.uploadedAt, texto: 'Subió un comprobante' })
  if (p?.status === 'approved' && p.decidedAt) hitos.push({ cuando: p.decidedAt, texto: 'Aprobaste el pago', tono: 'ok' })
  if (p?.balancePaidAt) hitos.push({ cuando: p.balancePaidAt, texto: 'Registraste el saldo', tono: 'ok' })
  if (p?.status === 'cancelled' && p.decidedAt) hitos.push({ cuando: p.decidedAt, texto: 'Cancelaste el pedido', tono: 'no' })
  if (c?.status === 'won' && c.statusChangedAt && p === null) hitos.push({ cuando: c.statusChangedAt, texto: 'Cerró la venta: evento creado', tono: 'ok' })
  if (c?.status === 'lost' && c.statusChangedAt) hitos.push({ cuando: c.statusChangedAt, texto: `Perdida · ${etiquetaDeMotivo(c.lostReason) ?? 'sin motivo'}`, tono: 'no' })
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
          <p className="font-mono text-[10.5px] tracking-[0.08em] text-ink-mute">{fechaHora(h.cuando)}</p>
        </li>
      ))}
      {v.etapa === 'por_crear_evento' ? (
        <li className="relative">
          <span aria-hidden className="absolute top-1.5 -left-5 size-[11px] rounded-full border-2 border-dashed border-gold bg-bg-raised" />
          <p className="text-[13.5px] text-ink-soft">Falta crear su evento</p>
        </li>
      ) : null}
      {eventoDeVenta(v) !== null ? (
        <li className="relative">
          <span aria-hidden className="absolute top-1.5 -left-5 flex size-[11px] items-center justify-center rounded-full bg-sage">
            <CheckIcon className="size-2 text-white" />
          </span>
          <p className="text-[13.5px] text-ink">Evento creado</p>
        </li>
      ) : null}
    </ol>
  )
}

function ListaDeComprobantes({ comprobantes }: { comprobantes: readonly ComprobanteDeVenta[] }) {
  if (comprobantes.length === 0) return <p className="text-[12.5px] text-ink-mute">Sin comprobante adjunto.</p>
  return (
    <ul className="flex flex-wrap gap-2">
      {comprobantes.map((k) => (
        <li key={k.id}>
          <a
            className="inline-flex items-center gap-2 rounded-full border border-line-panel-strong bg-white px-3.5 py-1.5 text-[12.5px] text-ink transition-colors hover:border-ink"
            href={`/panel/pedidos/comprobante/${k.id}`}
          >
            {k.originalName}
            <span className="font-mono text-[10.5px] text-ink-mute">{fechaHora(k.uploadedAt)}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 font-mono text-[10px] tracking-[0.18em] text-ink-mute uppercase">{titulo}</h3>
      {children}
    </section>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[11px] font-medium tracking-[0.1em] text-ink-mute uppercase">{etiqueta}</dt>
      <dd className="text-[14px] break-words text-ink">{children}</dd>
    </div>
  )
}
