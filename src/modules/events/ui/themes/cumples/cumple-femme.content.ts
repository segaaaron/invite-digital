import type { InvitationContent } from '../../../domain/invitation-content'

/**
 * El contenido de muestra de «Femme Fatale», copiado de la maqueta V5
 * (`invites-1.jsx:152`, `BirthdayInvite`, «Noche Escarlata»).
 *
 * Los avisos tienen sitio fijo y se leen por índice: **el primero** es la tarjeta de debajo
 * de la primera foto (la frase grande y la de cierre en cursiva), **el segundo** el brindis
 * (el titular encima de la segunda foto y la frase de debajo), **el tercero** la última fila
 * de la ficha («INVITADAS · Solo chicas») y **el cuarto** «La vibra de la noche» con sus
 * etiquetas, separadas por espacios.
 *
 * La cita son las tres líneas de debajo del titular, alternando caligrafía y versales:
 * «Te espero para festejar» · «UNA NOCHE SEXY Y SENSUAL» · «entre amigas».
 */
export const CONTENIDO_DE_MUESTRA: InvitationContent = {
  hero: { eyebrow: 'FIESTA DE DISFRACES', nameA: 'Femme Fatale' },
  quote: { text: 'Te espero para festejar\nUNA NOCHE SEXY Y SENSUAL\nentre amigas' },
  schedule: { startsAt: '2026-10-17T18:00:00' },
  gallery: [{ label: 'Tres amigas disfrazadas' }, { label: 'Brindis entre amigas' }],
  notes: [
    {
      title: 'Ponte tu mejor disfraz, trae tu mejor sonrisa y prepárate para una noche de risas, brindis y glamour.',
      text: 'Lo que pasa entre amigas... se queda entre amigas.',
    },
    {
      title: 'Brindamos por la diversión y la alegría de compartir juntas',
      text: 'Y un brindis especial por nuestras cumpleañeras del mes',
    },
    { title: 'INVITADAS', text: 'Solo chicas' },
    { title: 'LA VIBRA DE LA NOCHE', text: '#EntreAmigas #Reencuentro #Disfraces #Glamour #Brindis #Risas #Tentación' },
  ],
  reception: { place: 'Av. Arocagua Mayu, entre Pasaje Murutani y Calle Pedro Álvarez' },
  dressCode: { title: 'Disfraz sexy y elegante' },
  map: { href: 'https://www.google.com/maps/search/?api=1&query=Avenida+Arocagua+Mayu+Pasaje+Murutani+Cochabamba' },
  music: { track: 'LADY MARMALADE', artist: "Christina Aguilera, Lil' Kim, Mya, P!nk" },
  closing: { text: 'Ven disfrazada · Ven con ganas · Ven a brillar' },
}
