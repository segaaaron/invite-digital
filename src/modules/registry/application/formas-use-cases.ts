import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { registryError, type RegistryError } from '../domain/errors'
import { leerFormas, SIN_FORMAS, type FormasDeRegalar } from '../domain/formas-de-regalar'
import type { FormasDeRegalarStore, ImagenDeQr } from './ports'

/** El QR de un banco pesa unos KB; dos megas dejan margen para una captura de pantalla. */
export const MAX_QR_BYTES = 2 * 1024 * 1024

type Deps = {
  readonly formas: FormasDeRegalarStore
  /** El tipo por los primeros bytes —nunca por la extensión—, solo imágenes. Llega de la composición. */
  readonly tipoDeImagen: (bytes: Uint8Array) => string | null
}

export const leerFormasDeRegalar =
  (deps: Pick<Deps, 'formas'>) =>
  async (eventId: string): Promise<FormasDeRegalar> => {
    // Si la base no responde, la invitación se abre igual, sin esta sección.
    try {
      return await deps.formas.leer(eventId)
    } catch (causa) {
      console.error('no se pudieron leer las formas de regalar:', causa)
      return SIN_FORMAS
    }
  }

export const guardarFormasDeRegalar =
  (deps: Deps) =>
  async (input: {
    eventId: string
    entrada: Parameters<typeof leerFormas>[0]
    /** Un fichero nuevo, quitar el que había, o dejarlo como está. */
    qr: { readonly bytes: Uint8Array } | 'quitar' | 'mantener'
  }): Promise<Result<FormasDeRegalar, RegistryError>> => {
    let imagen: ImagenDeQr | 'quitar' | 'mantener' = input.qr === 'quitar' || input.qr === 'mantener' ? input.qr : 'mantener'
    if (typeof input.qr === 'object') {
      if (input.qr.bytes.length > MAX_QR_BYTES) return err(registryError('invalid_gift_ways', 'La imagen del QR pesa más de 2 MB.'))
      const tipo = deps.tipoDeImagen(input.qr.bytes)
      if (tipo === null) return err(registryError('invalid_gift_ways', 'El QR tiene que ser una imagen JPG, PNG o WEBP.'))
      imagen = { bytes: input.qr.bytes, tipo }
    }

    return attempt(
      async () => {
        const antes = await deps.formas.leer(input.eventId)
        const tieneQr = imagen === 'quitar' ? false : imagen === 'mantener' ? antes.tieneQr : true
        const leido = leerFormas(input.entrada, tieneQr)
        if (isErr(leido)) return leido
        const f = leido.value
        const datos = { sobres: f.sobres, sobresTexto: f.sobresTexto, transferencia: f.transferencia, banco: f.banco, titular: f.titular, cuenta: f.cuenta, nota: f.nota }
        await deps.formas.guardar(input.eventId, datos, imagen)
        return ok(leido.value)
      },
      (causa) => registryError('storage_failure', `No se pudieron guardar las formas de regalar: ${String(causa)}`),
    )
  }
