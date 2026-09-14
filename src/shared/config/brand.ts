export const BRAND = {
  siteName: 'Luxury Atelier',
  tagline: 'Atelier de invitaciones digitales',
  whatsapp: '+59170012345',
  whatsappDisplay: '+591 700 12345',
  /**
   * **Nadie lo lee.** Es el remitente de los correos del sistema (accesos y códigos): no se
   * enseña en ninguna parte como forma de contacto. El contacto es el WhatsApp.
   */
  email: 'no-reply@send.luxuryatelier.net',
  city: 'Cochabamba, Bolivia',
  /**
   * Los sellos de «organizadores que confían en nosotros» del hero.
   *
   * **Vacío por defecto, y entonces la banda no se pinta.** Publicar el nombre de una
   * marca ajena afirmando que confía en el atelier es afirmar una relación comercial que
   * puede no existir; con la lista vacía la portada simplemente no lo dice.
   */
  trustBrands: [] as readonly string[],
} as const
