import type { ReactNode } from 'react'
import { diaDeLaFiesta, diasHasta } from '@/shared/format/fecha'

type Fiesta = 'boda' | 'xv' | 'cumple'

const NOMBRE: Record<Fiesta, string> = { boda: 'Boda', xv: 'XV años', cumple: 'Cumpleaños' }
const LA_FIESTA: Record<Fiesta, string> = { boda: 'la boda', xv: 'los quince', cumple: 'el cumpleaños' }

/** «Boda, dom 18 de octubre»: qué fiesta y cuándo, bajo el nombre del evento en la barra y el menú. */
export const cuandoEs = (fiesta: Fiesta, fecha: string): string => `${NOMBRE[fiesta]}, ${diaDeLaFiesta(fecha)}`

/**
 * **Lo que dice la barra de arriba de un evento** (maqueta: «Faltan **6 días** para la boda»). Días de calendario en
 * Bolivia; el día mismo, mañana y lo ya celebrado se dicen con palabras.
 */
export function cuentaAtras(fiesta: Fiesta, fecha: string, ahora: Date): ReactNode {
  const dias = diasHasta(fecha, ahora)
  const fiestaDe = LA_FIESTA[fiesta]
  if (dias === 0) return <>Hoy es {fiestaDe}</>
  if (dias === 1) return <>Mañana es {fiestaDe}</>
  if (dias < 0) return <>{fiestaDe.charAt(0).toUpperCase() + fiestaDe.slice(1)} fue el {diaDeLaFiesta(fecha)}</>
  return (
    <>
      Faltan <strong className="font-semibold text-shell-deep">{dias} días</strong> para {fiestaDe}
    </>
  )
}
