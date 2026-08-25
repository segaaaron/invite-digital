export const BRAND = {
  siteName: 'InvitePremium',
  tagline: 'LUXE · Atelier digital',
  whatsapp: '+59170012345',
  whatsappDisplay: '+591 700 12345',
  email: 'atelier@invitepremium.bo',
  city: 'Cochabamba, Bolivia',
  /**
   * Los sellos de «organizadores que confían en nosotros» del hero.
   *
   * **Vacío por defecto, y entonces la banda no se pinta.** Publicar el nombre de una
   * marca ajena afirmando que confía en el atelier es afirmar una relación comercial que
   * puede no existir; con la lista vacía la portada simplemente no lo dice.
   */
  trustBrands: [] as readonly string[],
  /**
   * Los datos de la transferencia que ve quien hace un pedido.
   *
   * **Nacen como marcadores y `pnpm preflight` corta mientras lo sigan siendo.** Un
   * pedido que enseña un número de cuenta inventado no cobra a nadie, y el cliente se
   * entera cuando ya transfirió a la nada.
   *
   * `qrPath` apunta a una imagen dentro de `public/`. Vacío, la pantalla enseña solo los
   * datos escritos, que es mejor que un hueco con un icono roto.
   */
  payment: {
    bank: 'BANCO PENDIENTE',
    accountHolder: 'TITULAR PENDIENTE',
    accountNumber: 'CUENTA PENDIENTE',
    qrPath: '',
  },
} as const
