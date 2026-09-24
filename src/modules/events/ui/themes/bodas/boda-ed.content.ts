import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Editorial», copiado de la maqueta V3.
 *
 * La cita del principio son tres párrafos y el orden importa: el primero es el titular —con
 * sus saltos de línea; la última va en oro—, el segundo la firma de quien lo dice y el resto
 * la columna con capitular. Es como lo compone el diseño, y por eso no son tres campos.
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: 'NUESTRA BODA',
    monogram: '· MARÍA & ALEX ·',
    nameA: 'María',
    nameB: '& Alex',
    serial: '· NOS CASAMOS · 20.09.2026 ·',
  },
  quote: {
    text: '"Te ví y supe\nque era todo\nlo que iba a querer."\n\n— ALEX, 28\n\nFue en una librería de viejo, una tarde de septiembre. María buscaba a Borges. Alex tropezó con su pila de libros. Se cayeron tres tomos y un cuaderno de notas con dibujos. Lo demás, como suele decirse, es historia. Siete años más tarde, María escribe poemas. Alex sigue dibujando. Y ambos firman la suya, en septiembre, igual que la primera vez.',
  },
  hosts: {
    label: 'Con la bendición de Dios y de nuestros padres',
    names: [
      'Carmen Robles de Vargas',
      'Ricardo Vargas Núñez',
      'Lucía Mendoza de Terán',
      'Fernando Terán Castillo',
      'Elena Sandoval de Quiroga',
      'Andrés Quiroga Beltrán',
    ],
  },
  schedule: { startsAt: '2026-09-20T13:00:00' },
  ceremony: {
    label: 'Ceremonia Religiosa',
    place: 'Parroquia San Rafael',
    time: '13:00',
  },
  reception: {
    label: 'Recepción Social',
    place: 'Salón Los Cedros',
    address: '· KM 22 CARRETERA REAL · GTO ·',
    time: '15:00',
  },
  itinerary: [
    { time: '13:45', label: 'CEREMONIA RELIGIOSA' },
    { time: '16:00', label: 'RECEPCIÓN SOCIAL' },
    { time: '17:00', label: 'VALS DE LOS NOVIOS' },
    { time: '19:00', label: 'UNA DELICIOSA CENA' },
    { time: '21:00', label: 'PARTIMOS LA TORTA' },
    { time: '00:00', label: 'FELICES PARA SIEMPRE' },
  ],
  dressCode: {
    note: 'GALA ELEGANTE',
    title: 'Código de vestimenta',
    detail: 'Formal · paleta tierra · tejidos naturales · sin blanco · sin nude · sin neón.',
  },
  gallery: [{ label: 'María y Alex' }, { label: 'Nosotros' }],
  notes: [
    {
      title: 'Nuestro gran día',
      text: 'Nuestro gran día se aproxima y nos encantaría que formaras parte de él.',
    },
    {
      title: 'CELEBRACIÓN SOLO PARA ADULTOS',
      text: 'Los niños son alegría, pero esta noche queremos que ustedes también descansen.',
    },
    {
      title: 'Mesa de regalos',
      text: 'Su presencia es nuestro mejor regalo. Si además desean tener un detalle con nosotros, les dejamos algunas ideas.',
    },
    {
      title: 'Comparte tus fotos',
      text: 'Sube aquí las fotos que tomes durante el día. Nos encantará ver la boda desde tus ojos.',
    },
  ],
  closing: { text: 'Te esperamos.', signature: 'MARÍA & ALEX' },
}
