import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Cinemática», copiado de la maqueta. */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: '· A LOVE STORY ·',
    nameA: 'SOFÍA',
    nameB: 'DIEGO',
    monogram: '● REC · TAKE 014',
    serial: '· DIRECTED BY DESTINY ·',
  },
  quote: {
    text: 'Una historia de dos protagonistas que se encontraron sin guion, escribieron sus líneas sobre la marcha, y descubrieron que el final era el comienzo. Filmada en locación. Sin dobles. Sin segundas tomas.',
  },
  hosts: {
    label: '· SUPPORTING CAST ·',
    names: [
      'Padrinos · Patricio Vega & Lucía Saavedra',
      'Madrinas · Adriana Morales & Camila Núñez',
      'Damas & caballeros · 12 invitados de honor',
    ],
  },
  schedule: { startsAt: '2026-12-12T19:00:00' },
  reception: {
    label: '· LOCATION ·',
    place: 'Quinta del Roble',
    address: 'Camino al Lago 14 · Valle de Bravo',
    time: '19:00 HRS · DURATION 6 HRS',
  },
  map: { label: 'QUINTA DEL ROBLE', coords: '19.19°N · 100.13°W' },
  itinerary: [
    { time: 'SC.01', label: 'EXT. JARDÍN. ATARDECER.', note: 'Llegada · 18:30' },
    { time: 'SC.02', label: 'INT. CAPILLA. NOCHE.', note: 'Ceremonia · 19:00' },
    { time: 'SC.03', label: 'EXT. PATIO. NOCHE.', note: 'Brindis · 20:00' },
    { time: 'SC.04', label: 'INT. SALÓN. NOCHE.', note: 'Cena · 21:00' },
    { time: 'SC.05', label: 'INT. PISTA. MEDIANOCHE.', note: 'Primer baile · 23:00' },
    { time: 'SC.06', label: 'EXT. EXPLANADA. ALBA.', note: 'Fuegos · 02:00' },
    { time: 'CUT', label: 'FADE TO BLACK' },
  ],
  music: { track: 'La Vie en Rose · Édith Piaf', artist: 'Tema principal — main score' },
  dressCode: {
    title: 'Black tie',
    note: 'WARDROBE DEPT.',
    detail: 'Smoking · vestido largo · paleta cinematográfica: negro, oro, vino, mostaza.',
  },
  gallery: [
    { label: 'THE LOVERS · STILL #001' },
    { label: 'LA NOVIA' },
    { label: 'EL NOVIO' },
  ],
  closing: {
    text: 'Story by · life\nScreenplay · together\nOriginal score · the soundtrack of our years\nProducer · families\nCasting · destino\nBest Picture · this one.',
    signature: 'fin.',
  },
}
