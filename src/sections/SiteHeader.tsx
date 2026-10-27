'use client'

import { useEffect, useState } from 'react'
import { SELLO } from '@/sections/portada/sello'
import { BRAND } from '@/shared/config/brand'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'

type Props = { locale: Locale; dictionary: Dictionary }

/**
 * La cabecera de la maqueta «mix»: el sello con el nombre, las cinco entradas, la píldora que
 * lleva al cierre y, en pantalla estrecha, el menú a pantalla completa.
 *
 * **Es cliente** por dos cosas que la maqueta hace con JavaScript: abrir el menú (`#movilmenu.open`)
 * y poner la barra opaca al rodar (`nav.top.solid`). Lo demás —qué se ve y a qué ancho— lo decide
 * `portada.css`, que ya trae las medias del menú en 980 px: aquí no hay ni un estilo nuevo.
 *
 * El `.claro` de la maqueta (la barra sobre un fondo oscuro) queda fuera: el estreno es de lino
 * claro, y la clase ahí dejaría la marca invisible.
 */
export function SiteHeader({ locale, dictionary }: Props) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [solida, setSolida] = useState(false)
  const { pie, nav } = dictionary.portada

  // Por evento, nunca por reloj: la barra se vuelve opaca pasados los 80 px, como en la maqueta.
  useEffect(() => {
    const alRodar = () => setSolida(window.scrollY > 80)
    alRodar()
    window.addEventListener('scroll', alRodar, { passive: true })
    return () => window.removeEventListener('scroll', alRodar)
  }, [])

  // La cabecera sale en toda la web, no solo en la portada: las anclas van con el idioma delante
  // para que también funcionen desde colecciones o desde un pedido.
  const inicio = `/${locale}`
  const enlaces = [
    { href: `${inicio}#disenos`, label: nav.disenos },
    { href: `${inicio}#noche`, label: nav.noche },
    { href: `${inicio}#movil`, label: nav.invitacion },
    { href: `${inicio}#puerta`, label: nav.puerta },
    { href: `${inicio}#planes`, label: nav.planes },
  ]

  return (
    <>
      <nav className={solida ? 'top solid' : 'top'}>
        <a className="brand" href={`${inicio}#estreno`}>
          {/* El sello de lacre de la marca en 1x, 2x y 3x: reducir una copia pequeña dejaba la
              caligrafía borrosa. `.lamono` lo pone a 36 px. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            className="lamono"
            height={36}
            src={SELLO.src}
            srcSet={SELLO.srcSet}
            sizes={SELLO.sizes.barra}
            width={36}
          />
          {BRAND.siteName}
        </a>
        <div className="links">
          {enlaces.map((enlace) => (
            <a href={enlace.href} key={enlace.href}>
              {enlace.label}
            </a>
          ))}
        </div>
        <a className="cta-pill" href={`${inicio}#cierre`}>
          {nav.cta}
        </a>
        <button
          aria-controls="movilmenu"
          aria-expanded={menuAbierto}
          aria-label={dictionary.nav.menu}
          className="burger"
          onClick={() => setMenuAbierto(true)}
          type="button"
        >
          <span />
        </button>
      </nav>

      <div className={menuAbierto ? 'open' : undefined} id="movilmenu">
        <button aria-label={dictionary.nav.closeMenu} className="x" onClick={() => setMenuAbierto(false)} type="button">
          ×
        </button>
        {enlaces.map((enlace) => (
          <a href={enlace.href} key={enlace.href} onClick={() => setMenuAbierto(false)}>
            {enlace.label}
          </a>
        ))}
        <a href={`${inicio}#faq`} onClick={() => setMenuAbierto(false)}>
          {pie.preguntas}
        </a>
        <a className="cta-pill" href={`${inicio}#cierre`} onClick={() => setMenuAbierto(false)} style={{ marginTop: 14 }}>
          {nav.cta}
        </a>
      </div>
    </>
  )
}
