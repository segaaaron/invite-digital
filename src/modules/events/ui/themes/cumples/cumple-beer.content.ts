import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Cervecería Vintage», copiado de la maqueta
 * (`invites-4.jsx:479`, `BeerBirthdayInvite`).
 *
 * Los dos avisos no son intercambiables y el diseño los pinta en su sitio: **el primero**
 * es el bloque de la frase de arriba —caligrafía y párrafo—, y **el segundo**, el del
 * karaoke, junto al micrófono. Por eso `maxAvisos` es 2.
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  schedule: { startsAt: '2026-09-26T19:00:00' },
  notes: [
    {
      title: 'La vida se mide en buenos momentos.\nEste será uno de ellos.',
      text: 'Otro año más y lo celebramos como se debe: con amigos de verdad, cervezas bien frías y el micrófono encendido toda la noche.',
    },
    {
      title: 'Karaoke & Música',
      text: 'Ven preparado: habrá cerveza para el valor y micrófono para la locura.',
    },
  ],
  reception: {
    label: 'Recepción Social',
    place: 'El Bar de Miki',
    address: 'Calle W. Z. Tovar #2045\nEntre Circunvalación y Elena Rendón\nCochabamba',
    time: '19:00 HRS',
  },
  map: { label: 'EL BAR DE MIKI', coords: '17.39°S · 66.15°O' },
  music: { track: 'Karaoke de la casa', artist: 'La barra' },
  quote: { text: 'Porque los mejores momentos\nse viven entre amigos,\ncervezas y buena música.' },
  closing: {
    text: 'Tu cerveza ya tiene nombre. No faltes.',
    signature: '¡NOS VEMOS!',
  },
}
