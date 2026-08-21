import type { ComponentType, ReactNode } from 'react'
import type { Event } from '../../domain/event'
import { ClasicoTheme } from './ClasicoTheme'

export type ThemeProps = { event: Event; children: ReactNode }
export type InvitationTheme = { readonly key: string; readonly label: string; readonly Component: ComponentType<ThemeProps> }

/**
 * La invitación se compone a mano (sección 11 del spec): cada pieza entra aquí con su
 * clave. `theme_key` en la base es solo texto, así que una clave borrada de este
 * registro dejaría la invitación en blanco; por eso hay respaldo.
 */
const THEMES = {
  clasico: { key: 'clasico', label: 'Clásico marfil', Component: ClasicoTheme },
} as const satisfies Record<string, InvitationTheme>

export const THEME_KEYS: readonly string[] = Object.keys(THEMES)

export const themeFor = (key: string): InvitationTheme => (THEMES as Record<string, InvitationTheme>)[key] ?? THEMES.clasico
