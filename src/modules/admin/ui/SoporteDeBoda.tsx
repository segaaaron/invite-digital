/** Un anfitrión del evento, con su cuenta. Restablecer su acceso vive en «Accesos» (`EventClients`, maqueta E35/E66). */
export type Anfitrion = { readonly userId: string; readonly email: string; readonly phone?: string | null }
