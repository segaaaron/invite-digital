import Link from 'next/link'
import { BRAND } from '@/shared/config/brand'
import { FacebookIcon, InstagramIcon, TikTokIcon } from '@/shared/design/ui/icons'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'

/** Lo que el pie necesita de «La web», ya en el idioma de la página. */
export type PieDelSitio = {
  readonly direccion: string
  readonly ciudad: string
  readonly pais: string
  readonly cobertura: string
  readonly redes: { readonly instagram: string; readonly facebook: string; readonly tiktok: string }
  readonly privacidadPublicada: boolean
  readonly terminosPublicados: boolean
}

const REDES = [
  { clave: 'instagram', nombre: 'Instagram', Icono: InstagramIcon },
  { clave: 'facebook', nombre: 'Facebook', Icono: FacebookIcon },
  { clave: 'tiktok', nombre: 'TikTok', Icono: TikTokIcon },
] as const

/**
 * El pie de la web. Lleva el **nombre, la dirección y la cobertura del negocio** en cada
 * página, que es donde Google y los directorios los buscan para cotejarlos con la ficha: y
 * salen de «La web», la misma fuente que el marcado `LocalBusiness`, así que no pueden
 * desalinearse. Las redes y los enlaces legales solo aparecen si están configurados.
 */
export function SiteFooter({ locale, dictionary, sitio }: { locale: Locale; dictionary: Dictionary; sitio: PieDelSitio }) {
  const year = new Date().getUTCFullYear()
  const ubicacion = [sitio.direccion, sitio.ciudad, sitio.pais].filter((parte) => parte !== '').join(', ')
  const redes = REDES.filter((red) => sitio.redes[red.clave] !== '')

  return (
    // Una sola línea de tres bloques, como la maqueta: marca a la izquierda, cobertura en
    // medio y derechos a la derecha.
    <footer className="border-t border-[var(--color-line)] px-6 py-9">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-5 text-center">
        <span className="flex items-center gap-4">
          <span className="font-display text-[19px] tracking-[0.12em] text-gold-deep">{BRAND.siteName}</span>
          {redes.length === 0 ? null : (
            <span className="flex items-center gap-2.5">
              {redes.map(({ clave, nombre, Icono }) => (
                <a
                  aria-label={dictionary.footer.onNetwork.replace('{red}', nombre)}
                  className="grid size-8 place-items-center rounded-full border border-[var(--color-line)] text-gold-deep transition-colors hover:border-gold hover:text-ink"
                  href={sitio.redes[clave]}
                  key={clave}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Icono />
                </a>
              ))}
            </span>
          )}
        </span>
        <span className="text-[10.5px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
          {ubicacion}
          {sitio.cobertura === '' ? '' : ` · ${sitio.cobertura}`}
        </span>
        <span className="flex flex-wrap items-center justify-center gap-4 text-[10.5px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
          {sitio.privacidadPublicada ? (
            <Link className="hover:text-gold-deep" href={`/${locale}/privacidad`}>
              {dictionary.footer.privacy}
            </Link>
          ) : null}
          {sitio.terminosPublicados ? (
            <Link className="hover:text-gold-deep" href={`/${locale}/terminos`}>
              {dictionary.footer.terms}
            </Link>
          ) : null}
          <span>
            © {year} {dictionary.footer.rights}
          </span>
        </span>
      </div>
    </footer>
  )
}
