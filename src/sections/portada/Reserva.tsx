import { formatMoney, type Plan } from '@/modules/catalog'
import type { Dictionary } from '@/shared/i18n/dictionary'
import type { Locale } from '@/shared/i18n/locales'
import { SELLO } from './sello'

type Props = {
  readonly dictionary: Dictionary
  readonly locale: Locale
  readonly planes: readonly Plan[]
  readonly reservaCents: number | null
}

/**
 * **El sobre de la reserva**: se abre sobre la página desde la placa del cierre y, al enviar,
 * arma el mensaje de WhatsApp con lo que escribió el cliente. No guarda nada ni toca la base
 * —es una conversación que empieza—, así que no hay Server Action ni sesión que pedir.
 *
 * Llega cerrado desde el servidor (`hidden`): `PortadaVida` lo abre.
 */
export function Reserva({ dictionary, locale, planes, reservaCents }: Props) {
  const p = dictionary.portada.reserva
  const conReserva = (texto: string) => (reservaCents === null ? texto : texto.replace('{reserva}', formatMoney({ cents: reservaCents, currency: planes[0]?.price.currency ?? 'BOB' }, locale)))
  const destacado = planes.find((plan) => plan.highlighted) ?? planes[1] ?? planes[0]

  return (
    <div hidden id="reserva">
      <div className="velo" data-cerrar />
      <form className="sobre-form" id="formReserva">
        <button aria-label={p.cerrar} className="cerrar" data-cerrar type="button">
          ×
        </button>
        <img alt="" className="lacre-form" sizes={SELLO.sizes.carta} src={SELLO.src} srcSet={SELLO.srcSet} />
        <span className="eyebrow">{p.eyebrow}</span>
        <h3>
          {p.titulo} <span className="it">{p.tituloIt}</span>
        </h3>
        <p className="pie-form">{p.intro}</p>

        <label className="campo">
          <span>{p.nombres}</span>
          <input autoComplete="name" name="nombres" required type="text" />
        </label>

        <div className="fila2">
          <label className="campo">
            <span>{p.fiesta}</span>
            <select name="fiesta">
              {p.fiestas.map((fiesta) => (
                <option key={fiesta}>{fiesta}</option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>{p.fecha}</span>
            <input name="fecha" required type="date" />
          </label>
        </div>

        <label className="campo">
          <span>{p.telefono}</span>
          <input inputMode="tel" name="tel" required type="tel" />
        </label>

        <span className="campo-k">{p.plan}</span>
        <div className="planes-radio">
          {planes.map((plan) => (
            <label key={plan.slug}>
              <input defaultChecked={plan.slug === destacado?.slug} name="plan" type="radio" value={`${plan.name} · ${formatMoney(plan.price, locale)}`} />
              <b>{plan.name}</b>
              <i>{formatMoney(plan.price, locale)}</i>
            </label>
          ))}
        </div>

        <button className="enviar" type="submit">
          {p.enviar}
        </button>
        <p className="nota">{conReserva(p.nota)}</p>
        {/* Solo aparece si el mensaje no pudo salir: lo enciende `PortadaVida`. */}
        <p className="nota aviso" hidden>
          {p.aviso}
        </p>
      </form>
    </div>
  )
}
