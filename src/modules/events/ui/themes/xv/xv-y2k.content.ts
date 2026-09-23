import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Y2K Galaxy», copiado de su maqueta (`xv-variants.jsx`, `QuinceY2K`).
 *
 * La ficha técnica es la del diseño: la hora va en la recepción («20:00 → 02:00»), el
 * código de vestimenta en su título, y «TEMA» y «DJ» son los dos avisos. Las etiquetas del
 * `VIBE_STACK` son la frase, una por línea.
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: { nameA: 'Mariana' },
  quote: { text: '#y2k\n#pop\n#glitter\n#paris hilton\n#flip phones\n#mariposa\n#chrome' },
  schedule: { startsAt: '2026-10-08T20:00:00' },
  reception: { place: 'Sky Lounge · piso 18', time: '20:00 → 02:00' },
  map: { label: 'Sky Lounge', coords: '19.43°N · 99.17°W' },
  dressCode: { title: 'GLITTER · CHROME · GLAM' },
  notes: [
    { title: 'TEMA', text: 'Y2K · early 2000s galaxy' },
    { title: 'DJ', text: 'VEGA · pop hits' },
  ],
  gallery: [{ label: 'TBT 1' }, { label: 'TBT 2' }, { label: 'TBT 3' }, { label: 'HOY' }],
  music: { track: 'Toxic', artist: 'Britney Spears · 2003' },
}
