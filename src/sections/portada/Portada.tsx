import { formatMoney, type Plan } from '@/modules/catalog'
import { CloseIcon } from '@/shared/design/ui/icons'
import type { Dictionary } from '@/shared/i18n/dictionary'
import type { Locale } from '@/shared/i18n/locales'
import { rutaDe } from '@/shared/i18n/rutas'
import { Comparativa, type ColumnaDeComparativa } from './Comparativa'
import { ICONOS_DE_LA_NOCHE, ICONOS_DEL_MOVIL } from './iconos'
import { Planes } from './Planes'
import { Reserva } from './Reserva'
import { PortadaVida } from './PortadaVida'
import { SELLO } from './sello'
import type { TextosComparativa, GrupoDeComparativa } from '@/modules/plans'

/** Un modelo del catálogo tal como lo necesita la portada: su clave, su nombre y su portada. */
export type DisenoDePortada = {
  readonly clave: string
  readonly nombre: string
  readonly fiesta: 'boda' | 'xv'
  readonly portada: string
}

/** Las seis postales: la foto sale del catálogo, el texto del diccionario. */
const FOTOS_DE_POSTALES = [
  '/site/colecciones/bodas-1.avif',
  '/site/colecciones/bodas-2.avif',
  '/site/colecciones/xv-1.avif',
  '/site/colecciones/xv-2.avif',
  '/site/portada/cumple-1.webp',
  '/site/colecciones/graduacion-1.avif',
] as const

/** Las tiras de la invitación que se reproduce sola dentro del teléfono. */
const TIRAS = {
  boda: Array.from({ length: 10 }, (_, i) => `/site/portada/inv-${String(i + 1)}.webp`),
  xv: Array.from({ length: 5 }, (_, i) => `/site/portada/xv-${String(i + 1)}.webp`),
} as const

type Props = {
  readonly locale: Locale
  readonly dictionary: Dictionary
  /** Los veinte modelos a la venta, en el orden del catálogo. */
  readonly disenos: readonly DisenoDePortada[]
  /** Las nueve portadas del abanico de entrada, de las que ya están a la venta. */
  readonly abanico: readonly DisenoDePortada[]
  readonly planes: readonly Plan[]
  readonly reservas: Readonly<Record<string, number>>
  readonly columnas: readonly ColumnaDeComparativa[]
  readonly textosComparativa: TextosComparativa & {
    readonly feature: string
    readonly grupos: Record<GrupoDeComparativa, string>
    readonly todosIncluyen: string
  }
  /** El WhatsApp del atelier, solo dígitos. Vacío: el formulario no se enseña. */
  readonly whatsapp: string
}

/**
 * **La portada.** Es la maqueta «mix» que el usuario aprobó el 26 de octubre de 2026, con los
 * datos de verdad: los modelos del catálogo, los precios y los planes del admin, y los límites
 * de cada plan en la comparativa.
 *
 * Todo lo que se ve aquí se pinta **en el servidor**: los modelos, las postales, las doce
 * secciones, las notas y la tabla. `PortadaVida` solo le da movimiento —el abanico, el anillo,
 * los iconos que se dibujan, la pila de postales, el sobre de la reserva—; si el JavaScript no
 * llega, la página se lee entera igual.
 */
export function Portada({ locale, dictionary, disenos, abanico, planes, reservas, columnas, textosComparativa, whatsapp }: Props) {
  const p = dictionary.portada
  const rutaDelModelo = (clave: string) => rutaDe(locale, 'modelos', `/${clave}`)
  const primero = disenos[0]
  const laReserva = reservaEnPalabras(reservas, planes, locale)
  const conReserva = (texto: string) => texto.replace('{reserva}', laReserva)
  const reservaCents = Object.values(reservas).length === 0 ? null : Math.min(...Object.values(reservas))

  return (
    <>
      <div aria-hidden="true" id="pre">
        <div className="half l" />
        <div className="half r" />
        <img alt="" className="s" src={SELLO.src} srcSet={SELLO.srcSet} />
        <span className="cap">con amor, Luxury Atelier</span>
      </div>

      <div aria-hidden="true" id="atmos">
        <i className="vignette" />
        <i className="vel v1" />
        <i className="vel v2" />
        <i className="vel v3" />
      </div>

      {/* ===== EL ESTRENO: el abanico de portadas ===== */}
      <section id="estreno">
        <div aria-hidden="true" className="efondo" />
        <div aria-hidden="true" className="brillo" />
        {abanico.length === 0 ? null : (
        <div className="escena">
          <div className="abanico" id="abanico">
            {abanico.map((d, i) => (
              <div key={d.clave} className="tcard">
                {/* La del centro es la imagen principal de la página: se pide primero. */}
                <img alt="" fetchPriority={i === 4 ? 'high' : 'auto'} loading={i === 4 ? 'eager' : 'lazy'} src={d.portada} />
              </div>
            ))}
          </div>
        </div>
        )}
        <div className="wrap cabeza">
          <span className="eyebrow">{p.estreno.eyebrow}</span>
          <h2>
            <span className="l">
              <span>{p.estreno.titulo}</span>
            </span>
            <span className="l">
              <span className="it">{p.estreno.tituloIt}</span>
            </span>
          </h2>
          <p className="lead">{p.estreno.lead}</p>
        </div>
      </section>

      <div className="ribbon">
        <div className="track" id="ribbon">
          {[0, 1, 2, 3, 4, 5].flatMap((vuelta) =>
            p.cinta.map((palabra) => (
              <span key={`${String(vuelta)}-${palabra}`} className="par">
                <span>{palabra}</span>
                <b>✦</b>
              </span>
            )),
          )}
        </div>
      </div>

      {/* ===== EL ANILLO DE DISEÑOS ===== */}
      {disenos.length === 0 ? null : (
      <section id="disenos">
        <div className="wrap">
          <div className="sechead">
            <div className="eyebrow">{p.disenos.eyebrow}</div>
            <h2>
              <span data-w="cat">{p.disenos.titulo}</span> <span className="it" data-w="cat2">{p.disenos.tituloIt}</span>
            </h2>
            <div className="chips">
              <button className="chip on" data-f="todos" type="button">
                {p.disenos.todos}
              </button>
              <button className="chip" data-f="xv" type="button">
                {p.disenos.xv}
              </button>
              <button className="chip" data-f="boda" type="button">
                {p.disenos.bodas}
              </button>
            </div>
          </div>
        </div>
        <div data-cursor="arrastre" id="ring">
          <button aria-label={p.disenos.anterior} className="cfnav prev" type="button">
            <svg fill="none" height="15" stroke="currentColor" strokeWidth="1.1" viewBox="0 0 24 24" width="15">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <div id="carousel">
            {disenos.map((d) => (
              <a key={d.clave} aria-label={d.nombre} className="rcard" data-clave={d.clave} data-fiesta={d.fiesta} data-nombre={d.nombre} draggable={false} href={rutaDelModelo(d.clave)}>
                <img alt="" decoding="async" draggable="false" loading="lazy" src={d.portada} />
              </a>
            ))}
          </div>
          <button aria-label={p.disenos.siguiente} className="cfnav next" type="button">
            <svg fill="none" height="15" stroke="currentColor" strokeWidth="1.1" viewBox="0 0 24 24" width="15">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        {/*
          La capa donde se abre el modelo: el anillo se queda detrás, girando donde estaba, y la
          ✕ (o Esc, o la flecha de atrás) solo la cierra. Es un `<dialog>` de verdad, así que el
          foco, el velo y Esc los pone el navegador. Sin JavaScript no estorba: queda cerrado y
          las cartas siguen siendo enlaces a su página.
        */}
        <dialog id="vermodelo">
          <iframe className="vm-marco" title={p.disenos.verModelo} />
          <button aria-label={p.reserva.cerrar} className="vm-x" title={p.reserva.cerrar} type="button">
            <CloseIcon />
          </button>
        </dialog>
        <div className="wrap">
          <div id="cfmeta">
            {primero === undefined ? null : (
              // Solo el nombre: entrar en el modelo es tocar su portada, no leer un enlace debajo.
              <h3>{primero.nombre}</h3>
            )}
          </div>
        </div>
      </section>
      )}

      {/* ===== TODO LO QUE LA NOCHE NECESITA ===== */}
      <section id="noche">
        <div className="wrap">
          <div className="eyebrow">{p.noche.eyebrow}</div>
          <h2>
            {p.noche.titulo} <span className="it">{p.noche.tituloIt}</span>
          </h2>
          <div className="grid12" id="grid12">
            {p.noche.items.map((item, i) => (
              <article key={item.titulo} className="f12">
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <svg strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  {ICONOS_DE_LA_NOCHE[i]}
                </svg>
                <h4>{item.titulo}</h4>
                <p>{item.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== UNA GALA PARA CADA HISTORIA ===== */}
      <section id="historias">
        <div className="wrap">
          <div className="sechead">
            <div className="eyebrow">{p.historias.eyebrow}</div>
            <h2>
              {p.historias.titulo} <span className="it">{p.historias.tituloIt}</span>
            </h2>
          </div>
        </div>
        <div id="pila">
          <div className="pilainner" id="pilainner">
            {p.historias.postales.map((postal, i) => (
              <article key={postal.titulo} className="postal">
                <div className="marco">
                  <img alt="" decoding="async" loading="lazy" src={FOTOS_DE_POSTALES[i]} />
                </div>
                <div className="pie">
                  <b>{postal.titulo}</b>
                  <span>{postal.pie}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="costura">
        <div className="s" />
      </div>

      {/* ===== LA INVITACIÓN EN EL TELÉFONO ===== */}
      <section id="movil">
        <div className="wrap row">
          <div className="phonewrap">
            <div className="phone">
              <div className="live">
                <b />
                {p.movil.enVivo}
              </div>
              <div className="notch" />
              <div className="scr">
                {/* Las tiras son la invitación real, de arriba abajo. Decorativas: lo que
                    cuentan lo dice el texto de al lado. */}
                <div aria-hidden="true" id="inv">
                  {TIRAS.boda.map((src) => (
                    <img key={src} alt="" className="ivs" decoding="async" src={src} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="eyebrow">{p.movil.eyebrow}</div>
            <h2>
              <span data-w="tel">{p.movil.titulo}</span> <span className="it" data-w="tel2">{p.movil.tituloIt}</span>
            </h2>
            <p className="lead lead-movil">{p.movil.lead}</p>
            <ul className="bullets">
              {p.movil.puntos.map((punto, i) => (
                <li key={punto.titulo}>
                  <svg viewBox="0 0 24 24">{ICONOS_DEL_MOVIL[i]}</svg>
                  <div>
                    <h4>{punto.titulo}</h4>
                    <p>{punto.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== LA PUERTA ===== */}
      <section id="puerta">
        <div aria-hidden="true" className="pfondo">
          <img alt="" className="on" data-mundo="neutro" decoding="async" src="/site/portada/puerta-checkin.webp" />
          <img alt="" data-mundo="boda" decoding="async" src="/site/portada/puerta-checkin.webp" />
          <img alt="" data-mundo="xv" decoding="async" src="/site/portada/quince-entrada.webp" />
        </div>
        <div className="capa">
          <div className="wrap">
            <div className="puerta-txt">
              <span className="eyebrow">{p.puerta.eyebrow}</span>
              <h2>
                {p.puerta.titulo} <span className="it">{p.puerta.tituloIt}</span>
              </h2>
              <p className="lead">{p.puerta.lead}</p>
              <div className="contador">
                <div>
                  <strong data-count="74">0</strong>
                  <span>{p.puerta.dentro}</span>
                </div>
                <div>
                  <strong data-count="96">0</strong>
                  <span>{p.puerta.confirmados}</span>
                </div>
                <div>
                  <strong data-count="16">0</strong>
                  <span>{p.puerta.mesas}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="tarjeta-bien">
          <span className="ok">{p.puerta.bienvenidos}</span>
          <strong>{p.puerta.familia}</strong>
          <span className="det">{p.puerta.detalle}</span>
        </div>
      </section>

      {/* ===== EL ITINERARIO ===== */}
      <section id="pasos">
        <div className="wrap">
          <div className="sechead">
            <div className="eyebrow">{p.pasos.eyebrow}</div>
            <h2>
              {p.pasos.titulo} <span className="it">{p.pasos.tituloIt}</span>
            </h2>
          </div>
          <div className="vine" id="vine">
            <svg aria-hidden="true" className="stem" preserveAspectRatio="none" viewBox="0 0 120 1000">
              <path d="M60 0 C20 120 100 200 60 320 S20 520 60 640 S100 860 60 1000" fill="none" id="stem" stroke="var(--gold)" strokeWidth="2" />
            </svg>
            {p.pasos.items.map((paso, i) => {
              const dot = <span className="dot">{String(i + 1)}</span>
              const txt = (
                <div className="txt">
                  <h3>{conReserva(paso.titulo)}</h3>
                  <p>{paso.texto}</p>
                </div>
              )
              return (
                <div key={paso.titulo} className="st">
                  {i % 2 === 0 ? txt : dot}
                  {i % 2 === 0 ? dot : txt}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {planes.length === 0 ? null : <Planes dictionary={dictionary} locale={locale} planes={planes} reservas={reservas} />}

      <Comparativa columnas={columnas} dictionary={dictionary} textos={textosComparativa} />

      {/* ===== LAS NOTAS ===== */}
      <section id="faq">
        <div className="wrap">
          <div className="sechead">
            <div className="eyebrow">{p.notas.eyebrow}</div>
            <h2>
              {p.notas.titulo} <span className="it">{p.notas.tituloIt}</span>
            </h2>
          </div>
          <div className="qs" id="qs">
            {p.notas.items.map((nota) => (
              <div key={nota.pregunta} className="q">
                <button aria-expanded="false" type="button">
                  {nota.pregunta}
                  <span className="pm" />
                </button>
                <div className="ans">
                  <p>{conReserva(nota.respuesta)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== EL CIERRE ===== */}
      <section id="cierre">
        <div aria-hidden="true" className="cfondo">
          <img alt="" decoding="async" loading="lazy" src="/site/portada/baile.webp" />
        </div>
        <div className="wrap crow sola">
          <div className="cder">
            <div className="eyebrow">{p.cierre.eyebrow}</div>
            <h2>
              {p.cierre.titulo} <span className="it">{p.cierre.tituloIt}</span>
            </h2>
            <p className="lead">{conReserva(p.cierre.lead)}</p>
            {planes.length === 0 ? null : (
              <button className="placa" id="abrirReserva" type="button">
                <i />
                <span>{p.cierre.cta}</span>
                <em>↗</em>
              </button>
            )}
          </div>
        </div>
      </section>

      {planes.length === 0 ? null : <Reserva dictionary={dictionary} locale={locale} planes={planes} reservaCents={reservaCents} />}

      <PortadaVida
        disenos={disenos}
        tiras={TIRAS}
        palabras={{
          boda: { cat: p.disenos.titulo, cat2: p.disenos.tituloIt, tel: p.movil.titulo, tel2: p.movil.tituloIt },
          xv: { cat: p.disenos.tituloXv, cat2: p.disenos.tituloXvIt, tel: p.movil.titulo, tel2: p.movil.tituloIt },
        }}
        reserva={{
          whatsapp,
          mensaje: p.reserva.mensaje,
          planes: planes.map((plan) => ({ nombre: plan.name, precio: plan.price.cents })),
          locale,
        }}
      />
    </>
  )
}

/**
 * La reserva, escrita, para las frases que la nombran. Sale del admin —`depositFixedCents`—,
 * nunca de un número escrito aquí. Sin reserva fija no se inventa ninguna: la frase se queda sin
 * importe y se lee igual.
 */
function reservaEnPalabras(reservas: Readonly<Record<string, number>>, planes: readonly Plan[], locale: Locale): string {
  const montos = Object.values(reservas)
  if (montos.length === 0) return ''
  return formatMoney({ cents: Math.min(...montos), currency: planes[0]?.price.currency ?? 'BOB' }, locale)
}
