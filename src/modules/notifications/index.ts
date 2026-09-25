/**
 * El correo saliente.
 *
 * Vive en su propio módulo y no dentro de `identity` o `events` porque lo usan los dos:
 * una cuenta de cliente nace tanto al darle acceso desde Configuración como al aprobar su
 * pedido, y las dos veces hay que mandarle lo mismo.
 *
 * Cada módulo se importa por este fichero: es lo que vigila `pnpm verify:boundaries`.
 */
export { clientAccessEmail, type AccesoDeCliente, type CorreoCompuesto } from './domain/client-access-email'
export { teamAccessEmail, type AccesoDelEquipo } from './domain/team-access-email'
export { passwordResetEmail } from './domain/password-reset-email'
export { supportAccessEmail } from './domain/support-access-email'
export { adminAlertEmail } from './domain/admin-alert-email'
export { rsvpHostEmail } from './domain/rsvp-host-email'
export type { EmailSender } from './application/ports'
