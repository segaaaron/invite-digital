import { after } from 'next/server'
import { avisos } from '@/app/composition/container'
import { avisoDeVenta } from '@/modules/notifications'

/**
 * Avisa a cada admin que algo le espera —un comprobante, una consulta—: en la campana y en sus aparatos
 * (push). **Sin correo** (28 de septiembre): el correo queda para las cuentas. Con `after`, cuando la
 * respuesta ya salió. Nunca lanza.
 */
export function avisarAlAdmin(aviso: { asunto: string; lineas: readonly string[]; ruta: string }): void {
  after(async () => {
    await avisos.alAdmin(avisoDeVenta({ titulo: aviso.asunto, detalle: aviso.lineas[0] ?? '', ruta: aviso.ruta }))
  })
}
