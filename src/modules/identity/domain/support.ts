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


