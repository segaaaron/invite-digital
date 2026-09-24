import { after } from 'next/server'
import { admin, notifications } from '@/app/composition/container'
import { isErr } from '@/shared/result'

/**
 * Le escribe a cada admin que algo le espera —un comprobante, una consulta—.
 *
 * Corre con `after`, **cuando la respuesta ya salió**: quien sube su comprobante no espera a
 * que se manden los correos, y si Resend no responde, su envío no se entera. Nunca lanza.
 */
export function avisarAlAdmin(aviso: { asunto: string; lineas: readonly string[]; ruta: string }): void {
  after(async () => {
    try {
      const usuarios = await admin.users()
      if (isErr(usuarios)) return
      const correos = usuarios.value.filter((u) => u.role === 'admin').map((u) => u.email)
      await Promise.all(correos.map((to) => notifications.sendAdminAlert({ to, ...aviso })))
    } catch (causa) {
      console.error('no se pudo avisar al admin:', causa)
    }
  })
}
