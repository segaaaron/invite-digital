import { formatMoney, type Plan } from '@/modules/catalog'
import type { Dictionary } from '@/shared/i18n/dictionary'
import type { Locale } from '@/shared/i18n/locales'
import { SELLO } from './sello'

type Linea = { readonly texto: string; readonly exclusivo: boolean }
type Bloque = { readonly rotulo: string | null; readonly pildoras: boolean; readonly lineas: Linea[] }

/** Sin tildes y en minúsculas, para reconocer «Entrega» lo escriba como lo escriba el admin. */
const llano = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

const ES_ENTREGA = new Set(['entrega', 'delivery'])

/**
 * Las características en bloques, con el mismo formato que ya usa el admin y la tarjeta de
 * precios: una línea acabada en dos puntos abre un grupo, lo que cuelga de «Entrega» se pinta
 * en píldoras y una línea acabada en «(exclusivo)» lleva su etiqueta.
 */
function enBloques(features: readonly string[]): Bloque[] {
  const bloques: Bloque[] = []
  for (const bruto of features) {
    const linea = bruto.trim()
    if (linea === '') continue
    if (linea.endsWith(':')) {
      const rotulo = linea.slice(0, -1).trim()
      bloques.push({ rotulo, pildoras: ES_ENTREGA.has(llano(rotulo)), lineas: [] })
      continue
    }
    const exclusivo = /\((exclusivo|exclusive)\)$/i.test(linea)
    const texto = exclusivo ? linea.replace(/\s*\((exclusivo|exclusive)\)$/i, '') : linea
    const ultimo = bloques[bloques.length - 1]
    if (ultimo === undefined) bloques.push({ rotulo: null, pildoras: false, lineas: [{ texto, exclusivo }] })
    else ultimo.lineas.push({ texto, exclusivo })
  }
  return bloques
}

/** Lo que va en negrita dorada: el admin lo marca entre *asteriscos*. */
function conAcento(texto: string) {
  const partes = texto.split(/\*([^*]+)\*/g)
  return partes.map((parte, i) => (i % 2 === 1 ? <em key={`${parte}-${String(i)}`}>{parte}</em> : parte))
}

/** Lo que tarda y lo que dura, por `slug`. Sale de la base: los mismos números que la tabla. */
export type EntregaDePlan = { readonly rondas: number | null; readonly dias: number | null; readonly onlineDays: number }

type Props = {
  readonly dictionary: Dictionary
  readonly locale: Locale
  readonly planes: readonly Plan[]
  readonly entregas: Readonly<Record<string, EntregaDePlan>>
  /** El trozo con el precio de Luxury Planner, ya escrito por quien leyó los extras. */
  readonly extraLuxury: string
  /** La reserva de cada plan por su `slug`, en centavos. La fija el admin. */
  readonly reservas: Readonly<Record<string, number>>
}

/**
 * **Los tres planes, cada uno dentro de su sobre.** La carta va metida en el sobre —la solapa
 * la tapa por abajo y el lacre cae sobre su punta—, con toda la información dentro y el botón
 * anclado al fondo para que los tres queden alineados.
 *
 * Los precios, los nombres, las frases y lo que incluye cada plan **salen del admin**, nunca
 * escritos aquí: cambiar un precio es una decisión comercial, no un despliegue.
 */
export function Planes({ dictionary, locale, planes, reservas, entregas, extraLuxury }: Props) {
  const p = dictionary.portada
  const reservaMinima = Object.values(reservas).sort((a, b) => a - b)[0]
  const conReserva = (texto: string, cents: number | undefined) =>
    (cents === undefined ? texto.replace(' con {reserva}', '').replace('{reserva}', '') : texto.replace('{reserva}', formatMoney({ cents, currency: planes[0]?.price.currency ?? 'BOB' }, locale))).replace(
      '{luxury}',
      extraLuxury,
    )

  return (
    <section id="planes">
      <div className="wrap">
        <div className="sechead">
          <div className="eyebrow">{p.planes.eyebrow}</div>
          <h2>
            {p.planes.titulo} <span className="it">{p.planes.tituloIt}</span>
          </h2>
          <p className="lead lead-centrada">{conReserva(p.planes.lead, reservaMinima)}</p>
        </div>
        <div className="envs">
          {planes.map((plan, i) => {
            const bloques = enBloques(plan.features)
            // **La entrega sale de la base**, no de la lista: son los mismos números que compara la
            // tabla. Un plan que no esté entre los activos se queda con lo que diga su lista.
            const entrega = entregas[plan.slug]
            const deLaBase =
              entrega === undefined
                ? []
                : [
                    ...(entrega.rondas !== null && entrega.rondas > 0 ? [p.planes.rondas.replace('{n}', String(entrega.rondas))] : []),
                    ...(entrega.dias !== null && entrega.dias > 0 ? [p.planes.lista.replace('{n}', String(entrega.dias))] : []),
                    entrega.onlineDays >= 180 && entrega.onlineDays % 30 === 0
                      ? p.planes.enLineaMeses.replace('{n}', String(entrega.onlineDays / 30))
                      : p.planes.enLineaDias.replace('{n}', String(entrega.onlineDays)),
                  ].map((texto) => ({ texto, exclusivo: false }))
            const pildoras = deLaBase.length > 0 ? deLaBase : bloques.filter((b) => b.pildoras).flatMap((b) => b.lineas)
            const listas = bloques.filter((b) => !b.pildoras)
            const ahorro = plan.priceBeforeCents !== null && plan.priceBeforeCents > plan.price.cents ? plan.priceBeforeCents - plan.price.cents : null
            const reserva = reservas[plan.slug]
            // El lema aprobado manda sobre el del admin: la portada habla de usted y la base
            // todavía tutea («Elige tu diseño»). Sin lema en el diccionario, el del admin.
            const lema = p.planes.lemas[i] ?? plan.tagline
            return (
              <div key={plan.slug} className={plan.highlighted ? 'env star' : 'env'}>
                <div className="back" />
                <div className="lettr">
                  {plan.highlighted ? <span className="tag">{p.planes.masElegido}</span> : null}
                  <h3>{plan.name}</h3>
                  <div className="linea">{lema}</div>
                  {ahorro === null || plan.priceBeforeCents === null ? null : (
                    <div className="antes">
                      <s>{formatMoney({ cents: plan.priceBeforeCents, currency: plan.price.currency }, locale)}</s>
                      <em>{p.planes.ahorra.replace('{monto}', formatMoney({ cents: ahorro, currency: plan.price.currency }, locale))}</em>
                    </div>
                  )}
                  <div className="price">
                    {formatMoney(plan.price, locale)}
                    <span>{p.planes.porEvento}</span>
                  </div>
                  {reserva === undefined ? null : <div className="res">{conReserva(p.planes.reserva, reserva)}</div>}
                  <p className="desc">{plan.description}</p>
                  <ul className="feats">
                    {listas.flatMap((bloque, bi) => [
                      ...(bloque.rotulo === null
                        ? []
                        : [
                            <li key={`r-${String(bi)}`} className="gr">
                              {bloque.rotulo}
                            </li>,
                          ]),
                      ...bloque.lineas.map((linea) => (
                        <li key={linea.texto}>
                          {conAcento(linea.texto)}
                          {linea.exclusivo ? <span className="ex">{p.planes.exclusivo}</span> : null}
                        </li>
                      )),
                    ])}
                  </ul>
                  {pildoras.length === 0 ? null : (
                    <div className="pills">
                      {pildoras.map((linea) => (
                        <span key={linea.texto}>{conAcento(linea.texto)}</span>
                      ))}
                    </div>
                  )}
                  <a className="btn-plan" data-plan={plan.slug} data-reserva href="#cierre">
                    {p.planes.elegir.replace('{plan}', plan.name)}
                  </a>
                </div>
                <div className="front" />
                <img alt="" className="seal2" sizes={SELLO.sizes.sobre} src={SELLO.src} srcSet={SELLO.srcSet} />
              </div>
            )
          })}
        </div>
        {/* El diseño que el cliente eligió en el escaparate (lo escribe `PortadaVida`): se ve al llegar a los planes. */}
        <p className="diseno-elegido" hidden id="disenoElegidoPlanes">
          {p.planes.disenoElegido} <b />
        </p>
        <p className="resline">{conReserva(p.planes.pie, reservaMinima)}</p>
        {planes.some((plan) => plan.priceBeforeCents !== null && plan.priceBeforeCents > plan.price.cents) ? <p className="nota-lanzamiento">{dictionary.pricing.comparison.notaLanzamiento}</p> : null}
      </div>
    </section>
  )
}
