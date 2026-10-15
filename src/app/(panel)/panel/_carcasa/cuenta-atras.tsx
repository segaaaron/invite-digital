import type { ReactNode } from 'react'
import { diaDeLaFiesta, diasHasta } from '@/shared/format/fecha'
import type { Locale } from '@/shared/i18n/locales'

type Fiesta = 'boda' | 'xv' | 'cumple'

const NOMBRE: Record<Locale, Record<Fiesta, string>> = {
  es: { boda: 'Boda', xv: 'XV años', cumple: 'Cumpleaños' },
  en: { boda: 'Wedding', xv: 'Quinceañera', cumple: 'Birthday' },
}
const LA_FIESTA: Record<Locale, Record<Fiesta, string>> = {
  es: { boda: 'la boda', xv: 'los quince', cumple: 'el cumpleaños' },
  en: { boda: 'the wedding', xv: 'the quinceañera', cumple: 'the birthday' },
}

/** «Boda, dom 18 de octubre» («Wedding, Sun, October 18»): qué fiesta y cuándo, bajo el nombre del evento en la barra y el menú. */
export const cuandoEs = (fiesta: Fiesta, fecha: string, locale: Locale): string => `${NOMBRE[locale][fiesta]}, ${diaDeLaFiesta(fecha, locale)}`

/**
 * **Lo que dice la barra de arriba de un evento** (maqueta: «Faltan **6 días** para la boda»). Días de calendario en
 * Bolivia; el día mismo, mañana y lo ya celebrado se dicen con palabras.
 */
export function cuentaAtras(fiesta: Fiesta, fecha: string, ahora: Date, locale: Locale): ReactNode {
  const dias = diasHasta(fecha, ahora)
  const fiestaDe = LA_FIESTA[locale][fiesta]
  const Fiesta = fiestaDe.charAt(0).toUpperCase() + fiestaDe.slice(1)
  const numero = <strong className="font-semibold text-shell-deep">{locale === 'es' ? `${dias} días` : `${dias} days`}</strong>
  if (locale === 'en') {
    if (dias === 0) return <>{Fiesta} is today</>
    if (dias === 1) return <>{Fiesta} is tomorrow</>
    if (dias < 0) return <>{Fiesta} was on {diaDeLaFiesta(fecha, locale)}</>
    return <>{numero} to go until {fiestaDe}</>
  }
  if (dias === 0) return <>Hoy es {fiestaDe}</>
  if (dias === 1) return <>Mañana es {fiestaDe}</>
  if (dias < 0) return <>{Fiesta} fue el {diaDeLaFiesta(fecha, locale)}</>
  return <>Faltan {numero} para {fiestaDe}</>
}
