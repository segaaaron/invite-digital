import { clasicoDefinition } from './ClasicoTheme'
import { bodaDefinition } from './bodas/boda'
import { bodaBotDefinition } from './bodas/boda-bot'
import { esenciaDefinition } from './bodas/esencia'
import { bodaSelloDefinition } from './bodas/boda-sello'
import { bodaSerenidadDefinition } from './bodas/boda-serenidad'
import { bodaRoyalDefinition } from './bodas/boda-royal'
import { bodaGlamourDefinition } from './bodas/boda-glamour'
import { bodaBohoDefinition } from './bodas/boda-boho'
import { bodaPerlaDefinition } from './bodas/boda-perla'
import { bodaNavyDefinition } from './bodas/boda-navy'
import { bodaCinDefinition } from './bodas/boda-cin'
import { bodaEdDefinition } from './bodas/boda-ed'
import { anivDefinition } from './bodas/aniv'
import { civilDefinition } from './bodas/civil'
import { destDefinition } from './bodas/dest'
import { engDefinition } from './bodas/eng'
import { xvDefinition } from './xv/xv'
import { xvDecoDefinition } from './xv/xv-deco'
import { xvRealezaDefinition } from './xv/xv-realeza'
import { xvVogueDefinition } from './xv/xv-vogue'
import { xvY2kDefinition } from './xv/xv-y2k'
import { xvBohoDefinition } from './xv/xv-boho'
import { xvMinDefinition } from './xv/xv-min'
import { xvPrincDefinition } from './xv/xv-princ'
import { xvElegDefinition } from './xv/xv-eleg'
import { xvTropDefinition } from './xv/xv-trop'
import { xvIsabelleDefinition } from './xv/xv-isabelle'
import { xvNataliaDefinition } from './xv/xv-natalia'
import { xv_valentinaDefinition } from './xv/xv-valentina'
import { xv_lucianaDefinition } from './xv/xv-luciana'
import { xv_fantasiaDefinition } from './xv/xv-fantasia'
import { xv_valeriaDefinition } from './xv/xv-valeria'
import { xv_marianaDefinition } from './xv/xv-mariana'
import { cumpleBeerDefinition } from './cumples/cumple-beer'
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
  esencia: esenciaDefinition,
  'boda-sello': bodaSelloDefinition,
  'boda-serenidad': bodaSerenidadDefinition,
  'boda-royal': bodaRoyalDefinition,
  'boda-glamour': bodaGlamourDefinition,
  'boda-boho': bodaBohoDefinition,
  'boda-perla': bodaPerlaDefinition,
  'boda-navy': bodaNavyDefinition,
  'boda-cin': bodaCinDefinition,
  'boda-ed': bodaEdDefinition,
  civil: civilDefinition,
  aniv: anivDefinition,
  eng: engDefinition,
  dest: destDefinition,
  xv: xvDefinition,
  'xv-natalia': xvNataliaDefinition,
  'xv-valentina': xv_valentinaDefinition,
  'xv-luciana': xv_lucianaDefinition,
  'xv-fantasia': xv_fantasiaDefinition,
  'xv-valeria': xv_valeriaDefinition,
  'xv-mariana': xv_marianaDefinition,
  'xv-isabelle': xvIsabelleDefinition,
  'xv-trop': xvTropDefinition,
  'xv-eleg': xvElegDefinition,
  'xv-princ': xvPrincDefinition,
  'xv-min': xvMinDefinition,
  'xv-boho': xvBohoDefinition,
  'xv-y2k': xvY2kDefinition,
  'xv-vogue': xvVogueDefinition,
  'xv-realeza': xvRealezaDefinition,
  'xv-deco': xvDecoDefinition,
  // Cumpleaños. Portado y **sin publicar**: el catálogo lo lleva con `publicar: false`, así
  // que no sale en la web; el admin lo asigna desde el panel.
  'cumple-beer': cumpleBeerDefinition,
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
