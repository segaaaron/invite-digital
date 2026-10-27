import Link from 'next/link'
import { SELLO } from '@/sections/portada/sello'
import type { ReactNode } from 'react'
import { BRAND } from '@/shared/config/brand'
import { enlaceWhatsapp } from '@/shared/whatsapp'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'
import { rutaDe } from '@/shared/i18n/rutas'

/** Lo que el pie necesita de «La web», ya en el idioma de la página. */
export type PieDelSitio = {
  readonly direccion: string
  readonly ciudad: string
  readonly pais: string
  readonly cobertura: string
  /** El WhatsApp del negocio y cómo se lee (`+591 700 12345`). Vacío, no se pinta. */
  readonly whatsapp: string
  readonly whatsappVisible: string
  readonly mensajeGeneral: string
  readonly redes: { readonly instagram: string; readonly facebook: string; readonly tiktok: string; readonly correo?: string }
  readonly privacidadPublicada: boolean
  readonly terminosPublicados: boolean
}

/** El icono de WhatsApp de la maqueta, tal cual: va en el teléfono del pie y en el corro de redes. */
const ICONO_WHATSAPP = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.86 9.86 0 004.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0012.04 2zm0 18.15h-.01a8.2 8.2 0 01-4.18-1.15l-.3-.18-3.1.81.83-3.03-.2-.31a8.16 8.16 0 01-1.25-4.39c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.82c0 4.54-3.69 8.24-8.26 8.24zm4.52-6.17c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23a7.4 7.4 0 01-1.37-1.71c-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.84-.2-.49-.4-.42-.55-.43h-.48c-.16 0-.42.06-.64.3-.22.25-.84.82-.84 2s.86 2.32.98 2.48c.12.17 1.69 2.58 4.1 3.62.57.24 1.02.39 1.37.5.58.18 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.47-.29z" />
  </svg>
)

/** Las tres redes del corro, con el dibujo de la maqueta. El enlace sale de «La web». */
/**
 * Las redes del atelier. **Mientras no haya cuenta cargada en «La web», el icono lleva a la red**
 * —a instagram.com, no a un `#` que no va a ninguna parte—: el usuario lo pidió así el 26 de
 * octubre, hasta que existan los perfiles. En cuanto el admin escriba la dirección, manda la suya.
 */
const REDES: readonly { readonly clave: 'instagram' | 'facebook' | 'tiktok'; readonly nombre: string; readonly casa: string; readonly icono: ReactNode }[] = [
  {
    clave: 'instagram',
    nombre: 'Instagram',
    casa: 'https://www.instagram.com/',
    icono: (
      <svg aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.35" viewBox="0 0 24 24">
        <rect height="17.6" rx="5" width="17.6" x="3.2" y="3.2" />
        <circle cx="12" cy="12" r="4.1" />
        <circle cx="17.1" cy="6.9" fill="currentColor" r="1.05" stroke="none" />
      </svg>
    ),
  },
  {
    clave: 'facebook',
    nombre: 'Facebook',
    casa: 'https://www.facebook.com/',
    icono: (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M13.3 21v-8.2h2.7l.4-3.2h-3.1V7.6c0-.9.3-1.5 1.6-1.5h1.6V3.2c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.4H7.4v3.2h2.7V21z" />
      </svg>
    ),
  },
  {
    clave: 'tiktok',
    nombre: 'TikTok',
    casa: 'https://www.tiktok.com/',
    icono: (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M16.1 2.2h2.7a4 4 0 003.5 3.5v2.7a6.7 6.7 0 01-3.5-1.1v6.2a5.9 5.9 0 11-5.9-5.9l.8.1v2.8a3.1 3.1 0 102.4 3V2.2z" />
      </svg>
    ),
  },
]

/**
 * El pie de la maqueta «mix»: la marca con su oficio y su WhatsApp, dos columnas de anclas, la
 * columna de la fecha con la píldora al cierre y el corro de redes; abajo, los derechos, lo legal
 * y quién lo hizo.
 *
 * **Sin ubicación** (decisión del usuario): ni ciudad, ni país, ni dirección; `sitio` las sigue
 * trayendo porque las usa el marcado `LocalBusiness`, pero el pie no las pinta.
 */
export function SiteFooter({ locale, dictionary, sitio }: { locale: Locale; dictionary: Dictionary; sitio: PieDelSitio }) {
  const year = new Date().getUTCFullYear()
  const { pie, cierre } = dictionary.portada
  const inicio = `/${locale}`
  // En Bolivia se atiende por WhatsApp: el número, a un toque en cada página.
  const whatsapp = enlaceWhatsapp(sitio.whatsapp, sitio.mensajeGeneral)
  // `fechaTexto` lleva «{reserva}» y el pie no calcula precios: se queda con las frases que no
  // lo necesitan, cortadas por el punto, antes que enseñar un hueco donde va el importe.
  const fechaTexto = pie.fechaTexto
    .split('. ')
    .filter((frase) => !frase.includes('{reserva}'))
    .join('. ')
  const anclas = [
    { href: `${inicio}#disenos`, label: pie.enlaces.disenos },
    { href: `${inicio}#noche`, label: pie.enlaces.noche },
    { href: `${inicio}#movil`, label: pie.enlaces.invitacion },
    { href: `${inicio}#puerta`, label: pie.enlaces.puerta },
    { href: `${inicio}#pasos`, label: pie.enlaces.pasos },
    { href: `${inicio}#planes`, label: pie.enlaces.planes },
  ]

  return (
    <footer>
      <div aria-hidden="true" className="filo">
        <i />
      </div>
      <div className="pie-rejilla">
        <div className="pie-marca">
          <a className="marca" href={`${inicio}#estreno`}>
            {/* El mismo sello de lacre de la cabecera, aquí a 52 px por `.marca img`. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              height={52}
              src={SELLO.src}
              srcSet={SELLO.srcSet}
              sizes={SELLO.sizes.pie}
              width={52}
            />
            <b>{BRAND.siteName.toUpperCase()}</b>
          </a>
          <p>{pie.descripcion}</p>
          <p className="pie-donde">{pie.oficio}</p>
          {whatsapp === null ? null : (
            <a className="pie-tel" href={whatsapp} rel="noopener" target="_blank">
              {ICONO_WHATSAPP}
              {pie.whatsapp}
            </a>
          )}
        </div>

        <nav aria-label={pie.columnaGala} className="pie-col">
          <h5>{pie.columnaGala}</h5>
          {anclas.map((ancla) => (
            <a href={ancla.href} key={ancla.href}>
              {ancla.label}
            </a>
          ))}
        </nav>

        <nav aria-label={pie.columnaCelebraciones} className="pie-col">
          <h5>{pie.columnaCelebraciones}</h5>
          {pie.celebraciones.map((celebracion) => (
            <a href={`${inicio}#historias`} key={celebracion}>
              {celebracion}
            </a>
          ))}
          <a href={`${inicio}#faq`}>{pie.preguntas}</a>
        </nav>

        <div className="pie-col pie-res">
          <h5>{pie.columnaFecha}</h5>
          <p>{fechaTexto}</p>
          {/* En la maqueta este botón abre el sobre con JavaScript; aquí lleva al cierre, que es
              donde vive el sobre de la reserva. */}
          <a className="cta-pill" href={`${inicio}#cierre`}>
            {cierre.cta}
          </a>
          {/* Las cuatro redes salen siempre, como en la maqueta: la que todavía no tiene cuenta
              cargada en «La web» se queda en su sitio y no lleva a ninguna parte hasta que la haya. */}
          <div className="pie-redes">
            <a aria-label={dictionary.footer.onNetwork.replace('{red}', 'WhatsApp')} href={whatsapp ?? 'https://www.whatsapp.com/'} rel="noopener" target="_blank">
              {ICONO_WHATSAPP}
            </a>
            {REDES.map((red) => {
              const enlace = sitio.redes[red.clave]
              return (
                <a
                  aria-label={dictionary.footer.onNetwork.replace('{red}', red.nombre)}
                  href={enlace === '' ? red.casa : enlace}
                  key={red.clave}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {red.icono}
                </a>
              )
            })}
          </div>
        </div>
      </div>

      <div className="pie-bar">
        <div>
          © {year} {BRAND.siteName}
        </div>
        <div className="legal">
          {sitio.terminosPublicados ? <Link href={rutaDe(locale, 'terminos')}>{dictionary.footer.terms}</Link> : null}
          {sitio.privacidadPublicada ? <Link href={rutaDe(locale, 'privacidad')}>{dictionary.footer.privacy}</Link> : null}
        </div>
        <a className="pie-ms" href="https://www.ms-tech-stack.cloud/" rel="noopener" target="_blank">
          <i />
          {pie.disenadoPor} <b>MS Tech Stack</b>
        </a>
      </div>
    </footer>
  )
}
