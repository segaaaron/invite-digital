export const BRAND = {
  siteName: 'Luxury Atelier',
  tagline: 'Atelier de invitaciones digitales',
  /**
   * **Nadie lo lee.** Es el remitente de los correos del sistema (accesos y códigos): no se
   * enseña en ninguna parte como forma de contacto. El contacto es el WhatsApp.
   */
  email: 'no-reply@luxuryatelier.net',
  // WhatsApp, ciudad, redes, cifras de la portada y marcas ya **no viven aquí**: los edita
  // el admin en «La web» (`app_settings`, clave `site.settings`). Quitarlos de aquí es lo
  // que obliga al typecheck a recablear cada sitio que los usaba.
} as const
