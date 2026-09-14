/**
 * Quien entrega un correo.
 *
 * **Devuelve un booleano y no lanza nunca.** El correo es un extra: la cuenta del cliente
 * ya está creada y su contraseña se enseña en pantalla, que es como se repartía antes de
 * haber proveedor. Que el envío falle no puede tumbar el alta ni dejar al atelier con un
 * error donde debería ver credenciales.
 */
export interface EmailSender {
  send(input: { to: string; subject: string; text: string; html: string }): Promise<boolean>
}
