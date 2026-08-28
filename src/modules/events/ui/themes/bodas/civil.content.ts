import type { InvitationContent } from '../../../domain/invitation-content'

/** El contenido de muestra de «Civil», copiado de la maqueta. */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: {
    eyebrow: '· UNIÓN CIVIL · ACTA 2026 ·',
    nameA: 'Lucía',
    nameB: 'Andrés',
    monogram: '&',
    serial: 'FIRMAN EL ACTA · 18.05.2026',
  },
  hosts: {
    label: 'TESTIGOS DE LEY',
    names: ['Sergio Aldama · Marcela Rivas', 'Roberto Núñez · Camila Torres'],
  },
  schedule: { startsAt: '2026-05-18T13:00:00' },
  ceremony: { label: 'FIRMA', time: '13:00', place: 'Registro Civil', address: 'Plaza Cívica 4' },
  reception: { label: 'BRINDIS', time: '14:30', place: 'Casa Lucía', address: 'Terraza · Centro' },
  map: { label: 'REGISTRO CIVIL', coords: '19.43°N · 99.13°W' },
  gallery: [{ label: '1ª cita' }, { label: 'viaje' }, { label: 'el sí' }],
  closing: { text: 'Nos casamos entre los que nos quieren.', signature: 'L & A' },
}
