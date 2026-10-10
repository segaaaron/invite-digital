'use client'

import Link from 'next/link'
import { startTransition, useActionState, useId, useState } from 'react'
import { placeOrderAction, type PlaceOrderState } from '@/app/_acciones/orders/actions'
import type { OrderFormDictionary } from '@/shared/i18n/dictionary'
import type { Locale } from '@/shared/i18n/locales'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { formatMoney } from '@/modules/catalog'
import { enlaceWhatsapp } from '@/shared/whatsapp'

const INICIAL: PlaceOrderState = { status: 'idle' }

const CAMPO =
  'w-full rounded-[14px] border border-line bg-bg-top/80 px-4 py-3 text-[14px] text-ink outline-none transition-colors focus-visible:border-gold'
const ROTULO = 'font-mono text-[10.5px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase'

export type ModeloDelPedido = { readonly key: string; readonly label: string; readonly fiesta: 'boda' | 'xv' }
export type ExtraDelPedido = { readonly slug: string; readonly name: string; readonly descripcion: string | null; readonly cents: number }

/**
 * El alta de pedido de la web pública. Es dorado y no tinta: esto lo ve un cliente, no el
 * atelier, y la piel del panel se queda en el panel.
 */
export function OrderForm({
  planSlug,
  planName,
  priceLabel,
  templateSlug = null,
  templateName = null,
  priceCents,
  reservaCents = null,
  reservaPct = null,
  modelos = [],
  extras = [],
  terminosHref = null,
  referido = null,
  whatsapp = null,
  textos,
  locale,
}: {
  /** El código que llegó en el enlace de quien le recomendó (`?ref=`). */
  referido?: string | null
  /** El WhatsApp del atelier («La web»). Con él, tras el pedido se sigue la conversación allí. */
  whatsapp?: string | null
  /** Los rótulos y avisos del formulario, en el idioma de la página. */
  textos: OrderFormDictionary
  locale: Locale
  planSlug: string
  planName: string
  priceLabel: string
  /** El diseño que eligió en el escaparate, ya validado contra el registro de temas. */
  templateSlug?: string | null
  templateName?: string | null
  /** El precio del plan y su reserva fija (si la tiene), para el resumen de pago. */
  priceCents: number
  reservaCents?: number | null
  /** La reserva como porcentaje del total, si el plan la cobra así (la base la calcula igual). */
  reservaPct?: number | null
  /** Los modelos que se venden, para elegir aquí si no llegó con uno (9 oct). */
  modelos?: readonly ModeloDelPedido[]
  /** Los adicionales que este plan puede llevar (`extrasParaPedido`). */
  extras?: readonly ExtraDelPedido[]
  /** Con los términos publicados, aceptarlos es obligatorio. */
  terminosHref?: string | null
}) {
  const [estado, accion, pendiente] = useActionState<PlaceOrderState, FormData>(sinCaerse(placeOrderAction), INICIAL)
  const id = useId()
  const preelegido = modelos.find((m) => m.key === templateSlug)
  const [fiesta, setFiesta] = useState<'' | 'boda' | 'xv'>(preelegido?.fiesta ?? '')
  const [modelo, setModelo] = useState(templateSlug ?? '')
  const [elegidos, setElegidos] = useState<ReadonlySet<string>>(new Set())
  const dinero = (cents: number) => formatMoney({ cents, currency: 'BOB' }, locale)
  const extrasCents = extras.filter((x) => elegidos.has(x.slug)).reduce((s, x) => s + x.cents, 0)
  const total = priceCents + extrasCents
  // Igual que la base al crear el pedido: la reserva fija si es menor que el total; si no, su porcentaje
  // redondeado al boliviano; si tampoco, se paga entero.
  const hoy =
    reservaCents !== null && reservaCents < total
      ? reservaCents
      : reservaPct !== null && reservaPct >= 1 && reservaPct <= 99
        ? Math.round((total * reservaPct) / 10000) * 100
        : total
  const delaFiesta = modelos.filter((m) => fiesta === '' || m.fiesta === fiesta)

  if (estado.status === 'success') {
    const seguir = enlaceWhatsapp(whatsapp, textos.whatsappMessage.replace('{ref}', estado.publicRef).replace('{plan}', planName))
    return (
      <div className="flex flex-col gap-4 rounded-[18px] border border-gold/50 bg-gold/10 p-6" role="status">
        <p className="font-display text-[24px] font-light text-ink">{textos.successTitle}</p>
        <p className="text-[14px] text-ink-soft">
          {textos.successText.split('{ref}')[0]}
          <strong className="font-mono tracking-[0.2em]">{estado.publicRef}</strong>
          {textos.successText.split('{ref}')[1] ?? ''}
        </p>
        <Link
          className="w-fit rounded-[var(--radius-pill)] border border-gold bg-gold/20 px-5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-ink uppercase"
          href={`/${locale}/pedido/ref/${estado.publicRef}`}
        >
          {textos.goPay}
        </Link>
        {seguir === null ? null : (
          <a
            className="w-fit rounded-[var(--radius-pill)] border border-gold/60 px-5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-ink uppercase"
            href={seguir}
            rel="noopener noreferrer"
            target="_blank"
          >
            {textos.followWhatsapp}
          </a>
        )}
      </div>
    )
  }

  return (
    // Se envía sin `action={…}` a propósito: con él React 19 vacía el formulario cuando la acción devuelve un
    // error, y los adicionales y el modelo quedaban desmarcados en pantalla mientras el resumen los seguía
    // sumando (y el siguiente envío no los mandaba). Así, lo escrito y lo elegido se quedan.
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        const datos = new FormData(e.currentTarget)
        startTransition(() => accion(datos))
      }}
    >
      <input name="planSlug" type="hidden" value={planSlug} />
      {/* El diseño viaja con el pedido. Sin esto, quien aprueba no sabe cuál de los
          dieciséis miró el cliente, y el modelo se pasaba de boca a boca. */}
      {modelos.length === 0 && templateSlug !== null ? <input name="templateSlug" type="hidden" value={templateSlug} /> : null}

      <p className="text-[14px] text-ink-soft">
        {textos.plan} <strong className="font-normal text-ink">{planName}</strong> · {priceLabel}
      </p>

      {modelos.length === 0 && templateName !== null ? (
        <p className="text-[14px] text-ink-soft">
          {textos.design} <strong className="font-normal text-ink">{templateName}</strong>
        </p>
      ) : null}

      {modelos.length === 0 ? null : (
        <div className="grid gap-4 min-[560px]:grid-cols-2">
          <label className="flex flex-col gap-2" htmlFor={`${id}-fiesta`}>
            <span className={ROTULO}>{textos.eventType}</span>
            <select
              className={CAMPO}
              id={`${id}-fiesta`}
              name="fiesta"
              onChange={(e) => {
                const valor = e.target.value as '' | 'boda' | 'xv'
                setFiesta(valor)
                // Un modelo de la otra fiesta ya no vale.
                if (valor !== '' && modelos.find((m) => m.key === modelo)?.fiesta !== valor) setModelo('')
              }}
              required
              value={fiesta}
            >
              <option disabled value="">
                —
              </option>
              <option value="boda">{textos.eventTypes.boda}</option>
              <option value="xv">{textos.eventTypes.xv}</option>
            </select>
          </label>
          <label className="flex flex-col gap-2" htmlFor={`${id}-modelo`}>
            <span className={ROTULO}>{textos.model}</span>
            <select className={CAMPO} id={`${id}-modelo`} name="templateSlug" onChange={(e) => setModelo(e.target.value)} value={modelo}>
              <option value="">{textos.modelLater}</option>
              {delaFiesta.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {estado.status === 'error' ? (
        <p className="text-[13px] text-gold-deep" role="alert">
          {textos.errors[estado.code]}
        </p>
      ) : null}

      <label className="flex flex-col gap-2" htmlFor={`${id}-nombre`}>
        <span className={ROTULO}>{textos.name}</span>
        <input autoComplete="name" className={CAMPO} id={`${id}-nombre`} maxLength={160} name="customerName" required type="text" />
      </label>

      <label className="flex flex-col gap-2" htmlFor={`${id}-contacto`}>
        <span className={ROTULO}>{textos.contact}</span>
        <input autoComplete="tel" className={CAMPO} id={`${id}-contacto`} inputMode="tel" maxLength={40} name="contact" placeholder="+591 7…" required type="tel" />
      </label>

      <label className="flex flex-col gap-2" htmlFor={`${id}-correo`}>
        <span className={ROTULO}>{textos.email}</span>
        <input autoComplete="email" className={CAMPO} id={`${id}-correo`} maxLength={160} name="email" required type="email" />
      </label>

      <label className="flex flex-col gap-2" htmlFor={`${id}-fecha`}>
        <span className={ROTULO}>{textos.eventDate}</span>
        <input className={CAMPO} id={`${id}-fecha`} name="eventDate" required type="date" />
      </label>

      <label className="flex flex-col gap-2" htmlFor={`${id}-notas`}>
        <span className={ROTULO}>{textos.notes}</span>
        <textarea className={`${CAMPO} min-h-[110px]`} id={`${id}-notas`} maxLength={1000} name="notes" />
      </label>

      <label className="flex flex-col gap-2" htmlFor={`${id}-referido`}>
        <span className={ROTULO}>{textos.referral}</span>
        <input autoCapitalize="characters" className={`${CAMPO} uppercase`} defaultValue={referido ?? ''} id={`${id}-referido`} maxLength={16} name="referido" type="text" />
      </label>

      {extras.length === 0 ? null : (
        <fieldset className="flex flex-col gap-2.5">
          <legend className={`${ROTULO} mb-2`}>{textos.extrasTitle}</legend>
          {extras.map((x) => (
            <label
              className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-line bg-bg-top/80 px-4 py-3 transition-colors has-[:checked]:border-gold has-[:checked]:bg-gold/10"
              key={x.slug}
            >
              <input
                checked={elegidos.has(x.slug)}
                className="mt-1 size-4 accent-[var(--color-gold-deep)]"
                name="extras"
                onChange={(e) => {
                  const marcado = e.target.checked
                  setElegidos((antes) => {
                    const nuevo = new Set(antes)
                    if (marcado) nuevo.add(x.slug)
                    else nuevo.delete(x.slug)
                    return nuevo
                  })
                }}
                type="checkbox"
                value={x.slug}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[14px] text-ink">{x.name}</span>
                {x.descripcion ? <span className="text-[12.5px] leading-snug text-ink-soft">{x.descripcion}</span> : null}
              </span>
              <span className="shrink-0 font-display text-[18px] text-gold-deep [font-variant-numeric:lining-nums]">+{dinero(x.cents)}</span>
            </label>
          ))}
        </fieldset>
      )}

      {/* El resumen se recalcula al elegir: lo que se paga hoy y lo que queda para después. */}
      <section aria-label={textos.summaryTitle} className="flex flex-col gap-2 rounded-[18px] border border-gold/40 bg-gold/5 p-5 text-[14px] text-ink-soft">
        <p className="font-display text-[20px] text-ink">{textos.summaryTitle}</p>
        <p className="flex justify-between gap-4">
          <span>{planName}</span>
          <span className="text-ink">{dinero(priceCents)}</span>
        </p>
        {extrasCents > 0 ? (
          <p className="flex justify-between gap-4">
            <span>{textos.summaryExtras}</span>
            <span className="text-ink">+{dinero(extrasCents)}</span>
          </p>
        ) : null}
        <p className="flex justify-between gap-4 border-t border-gold/30 pt-2">
          <span>{textos.summaryTotal}</span>
          <span className="text-ink">{dinero(total)}</span>
        </p>
        <p className="flex items-baseline justify-between gap-4">
          <span className="text-ink">{textos.summaryToday}</span>
          <span className="font-display text-[26px] text-gold-deep [font-variant-numeric:lining-nums]">{dinero(hoy)}</span>
        </p>
        {total > hoy ? (
          <p className="flex justify-between gap-4">
            <span>{textos.summaryBalance}</span>
            <span className="text-ink">{dinero(total - hoy)}</span>
          </p>
        ) : null}
        <p className="text-[12.5px] text-ink-mute">
          {reservaCents !== null || reservaPct !== null ? `${textos.nonRefundable} ` : ''}
          {textos.summaryReferral}
        </p>
      </section>

      {terminosHref === null ? null : (
        <label className="flex items-start gap-3 text-[13.5px] text-ink-soft" htmlFor={`${id}-acepto`}>
          <input className="mt-0.5 size-4 accent-[var(--color-gold-deep)]" id={`${id}-acepto`} name="acepto" required type="checkbox" value="si" />
          <span>
            {textos.terms.split('{terminos}')[0]}
            <a className="text-gold-deep underline underline-offset-4" href={terminosHref} rel="noopener" target="_blank">
              {textos.termsLink}
            </a>
            {textos.terms.split('{terminos}')[1] ?? ''}
          </span>
        </label>
      )}

      <button
        className="w-full cursor-pointer rounded-[var(--radius-pill)] bg-gold px-7 py-3.5 text-[12px] tracking-[var(--tracking-luxe)] text-bg-raised uppercase transition-colors hover:bg-gold-deep disabled:opacity-50 min-[560px]:w-fit"
        disabled={pendiente}
        type="submit" aria-busy={(pendiente) || undefined}>
        {pendiente ? textos.submitting : textos.submit}
      </button>
    </form>
  )
}
