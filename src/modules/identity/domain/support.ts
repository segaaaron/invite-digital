import type { Actor } from './access'

/**
 * Qué actor devuelve una sesión. En modo soporte, **el cliente**, marcado con quién está
 * detrás; así toda guardia existente —secciones, barra, `requireAdmin`— lo trata como
 * cliente sin saber que el modo soporte existe.
 *
 * **Nunca sube privilegios.** Solo un admin abre el modo soporte: si quien tiene la sesión
 * ya no lo es, se ignora y se pide limpiar. Y la marca `soporte` solo la pone esta función:
 * cualquier otra que llegara se descarta.
 */
export function actorDeSesion(
  usuario: Actor,
  soporte: { id: string; adminEmail: string; cliente: Actor | null } | null,
): { actor: Actor; limpiar: boolean } {
  const limpio = sinMarca(usuario)
  if (soporte === null) return { actor: limpio, limpiar: false }
  if (usuario.role !== 'admin' || soporte.cliente === null) return { actor: limpio, limpiar: true }
  return {
    // Su contraseña provisional es suya: al admin no le toca cambiarla por él.
    actor: { ...sinMarca(soporte.cliente), mustChangePassword: false, soporte: { id: soporte.id, adminUserId: usuario.userId, adminEmail: soporte.adminEmail } },
    limpiar: false,
  }
}

const sinMarca = (a: Actor): Actor => ({ userId: a.userId, email: a.email, role: a.role, mustChangePassword: a.mustChangePassword })

export const MOTIVO_MIN = 10
export const MOTIVO_MAX = 500

/** El motivo de entrar como el cliente: se le manda al cliente y queda en la auditoría. */
export function leerMotivo(raw: string): { ok: true; motivo: string } | { ok: false; mensaje: string } {
  const motivo = raw.trim()
  if (motivo.length < MOTIVO_MIN) return { ok: false, mensaje: 'Escribe el motivo: al menos 10 caracteres.' }
  if (motivo.length > MOTIVO_MAX) return { ok: false, mensaje: 'El motivo pasa de 500 caracteres.' }
  return { ok: true, motivo }
}
