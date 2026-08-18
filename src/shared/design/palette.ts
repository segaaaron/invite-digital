/**
 * The brand palette as data, for the two renderers that never see CSS: the WebGL
 * materials in the hero scene and the Open Graph image, which satori renders outside
 * the browser. `tokens.css` stays the visual source of truth for the page — this file
 * mirrors it, and `palette.test.ts` fails if the two ever drift apart.
 */
export const PALETTE = {
  bg: '#f6f1e9',
  bgRaised: '#fdfaf4',
  bgSunken: '#efe7dc',
  bgTop: '#fffdf9',
  ink: '#2b2723',
  inkSoft: '#58514a',
  inkMute: '#9a917f',
  gold: '#c19b4a',
  goldDeep: '#a8823a',
  goldLight: '#e2c584',
} as const

export type PaletteColor = keyof typeof PALETTE

/** The CSS custom property each entry mirrors, used by the drift test. */
export const PALETTE_TOKENS: Record<PaletteColor, string> = {
  bg: '--color-bg',
  bgRaised: '--color-bg-raised',
  bgSunken: '--color-bg-sunken',
  bgTop: '--color-bg-top',
  ink: '--color-ink',
  inkSoft: '--color-ink-soft',
  inkMute: '--color-ink-mute',
  gold: '--color-gold',
  goldDeep: '--color-gold-deep',
  goldLight: '--color-gold-light',
}
