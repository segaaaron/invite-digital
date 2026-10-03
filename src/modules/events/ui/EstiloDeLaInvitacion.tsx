import type { CSSProperties, ReactNode } from 'react'
import { FONT_VARIABLES, type FontKey } from '@/shared/design/font-manifest'
import { themeFonts } from '@/shared/design/fonts'
import { variablesDeAcento, type EstiloDelEvento } from '../domain/estilo'
import type { ThemeDefinition } from './themes/contract'

const esLetra = (clave: string | null): clave is FontKey => clave !== null && clave in FONT_VARIABLES

/**
 * El estilo del evento (Gala) alrededor de su diseño: las variables del acento y la letra
 * redirigida. `display: contents`, así no es una caja más en la maqueta del diseño; las
 * variables CSS se heredan igual. Sin estilo, o con un diseño que no lo admite, no añade nada.
 */
export function EstiloDeLaInvitacion({ tema, estilo, children }: { tema: ThemeDefinition; estilo: EstiloDelEvento; children: ReactNode }) {
  const admite = tema.estilo
  if (admite === undefined) return <>{children}</>

  const variables: Record<string, string> = admite.acento === undefined ? {} : variablesDeAcento(admite.acento, estilo.acento)
  const clases: string[] = []
  for (const [rol, elegida] of [
    [admite.caligrafia, estilo.caligrafia],
    [admite.titulares, estilo.titulares],
  ] as const) {
    if (rol === undefined || !esLetra(elegida) || elegida === rol) continue
    variables[FONT_VARIABLES[rol]] = `var(${FONT_VARIABLES[elegida]})`
    clases.push(themeFonts[elegida].variable)
  }
  if (Object.keys(variables).length === 0) return <>{children}</>

  return (
    <div className={clases.join(' ') || undefined} style={{ display: 'contents', ...variables } as CSSProperties}>
      {children}
    </div>
  )
}
