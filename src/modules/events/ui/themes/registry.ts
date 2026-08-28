import { clasicoDefinition } from './ClasicoTheme'
import { bodaDefinition } from './bodas/boda'
import { bodaBotDefinition } from './bodas/boda-bot'
import { bodaCinDefinition } from './bodas/boda-cin'
import { bodaEdDefinition } from './bodas/boda-ed'
import { anivDefinition } from './bodas/aniv'
import { civilDefinition } from './bodas/civil'
import { destDefinition } from './bodas/dest'
import { engDefinition } from './bodas/eng'
import type { ThemeDefinition } from './contract'

/**
 * Los temas de invitación, por su clave.
 *
 * Cada archivo de tema exporta **su definición**, no solo su componente: sus tipografías
 * —para que el layout de invitado no baje doce familias cuando el diseño usa cinco—, sus
 * secciones —para que el panel no le pida un itinerario a un diseño que no lo pinta—, su
 * paleta y el contenido de muestra con el que se siembra.
 */
const THEMES = {
  clasico: clasicoDefinition,
  boda: bodaDefinition,
  'boda-bot': bodaBotDefinition,
  'boda-cin': bodaCinDefinition,
  'boda-ed': bodaEdDefinition,
  civil: civilDefinition,
  aniv: anivDefinition,
  eng: engDefinition,
  dest: destDefinition,
} as const satisfies Record<string, ThemeDefinition>

export const THEME_KEYS: readonly string[] = Object.keys(THEMES)

export const themeDefinitions = (): readonly ThemeDefinition[] => Object.values(THEMES)

/**
 * Una clave que el registro no conoce cae al clásico, y sigue siendo a propósito:
 * `theme_key` en la base es solo texto, así que una clave borrada de aquí —o escrita a
 * mano en una migración— dejaría la invitación en blanco el día de la boda. El clásico es
 * sobrio, pero es una invitación.
 */
export const themeFor = (key: string): ThemeDefinition =>
  (THEMES as Record<string, ThemeDefinition>)[key] ?? THEMES.clasico
