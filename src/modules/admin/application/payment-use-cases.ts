import type { Actor } from '@/modules/identity/domain/access'
import { attempt, ok, type Result } from '@/shared/result'
import { adminError, type AdminError } from '../domain/errors'
import { EMPTY_PAYMENT_SETTINGS, PAYMENT_KEYS, type PaymentSettings } from '../domain/payment-settings'
import type { AdminRepository, FileStore, SettingsRepository } from './ports'

type Deps = { settings: SettingsRepository }

export const readPaymentSettings =
  (deps: Deps) =>
  async (): Promise<Result<PaymentSettings & { qrImageKey: string | null }, AdminError>> =>
    attempt(
      async () => {
        const filas = await deps.settings.readAll()
        const qrImageKey = filas[PAYMENT_KEYS.qrImage] ?? null

        return ok({
          bank: filas[PAYMENT_KEYS.bank] ?? EMPTY_PAYMENT_SETTINGS.bank,
          accountHolder: filas[PAYMENT_KEYS.accountHolder] ?? EMPTY_PAYMENT_SETTINGS.accountHolder,
          accountNumber: filas[PAYMENT_KEYS.accountNumber] ?? EMPTY_PAYMENT_SETTINGS.accountNumber,
          notes: filas[PAYMENT_KEYS.notes] ?? EMPTY_PAYMENT_SETTINGS.notes,
          hasQrImage: qrImageKey !== null,
          qrImageKey,
        })
      },
      (cause) => adminError('storage_failure', `No se pudieron leer los datos de cobro: ${String(cause)}`),
    )

const MAX_LARGO = 160

/**
 * Guarda los datos escritos. El QR va por su propio caso de uso: es un fichero y tiene
 * otras reglas.
 */
export const savePaymentSettings =
  (deps: Deps & { admin: AdminRepository }) =>
  async (
    actor: Actor,
    input: { bank: string; accountHolder: string; accountNumber: string; notes: string },
  ): Promise<Result<null, AdminError>> =>
    attempt(
      async () => {
        const recortado = {
          bank: input.bank.trim().slice(0, MAX_LARGO),
          accountHolder: input.accountHolder.trim().slice(0, MAX_LARGO),
          accountNumber: input.accountNumber.trim().slice(0, MAX_LARGO),
          notes: input.notes.trim().slice(0, 500),
        }

        await deps.settings.write({
          [PAYMENT_KEYS.bank]: recortado.bank,
          [PAYMENT_KEYS.accountHolder]: recortado.accountHolder,
          [PAYMENT_KEYS.accountNumber]: recortado.accountNumber,
          [PAYMENT_KEYS.notes]: recortado.notes,
        })

        // El número de cuenta **no** entra en la auditoría: es un dato de cobro y el
        // registro se lee entero desde una pantalla. Basta con saber que se cambió.
        await deps.admin.record({
          actorUserId: actor.userId,
          actorEmail: actor.email,
          action: 'pagos.datos',
          subject: recortado.bank,
        })

        return ok(null)
      },
      (cause) => adminError('storage_failure', `No se pudieron guardar los datos de cobro: ${String(cause)}`),
    )

/**
 * Sube la imagen del QR de cobro.
 *
 * **No lo generamos nosotros y no podemos.** En Bolivia el QR de cobro lo emite el sistema
 * financiero: los códigos van cifrados y firmados por el banco. Lo único que hacemos aquí
 * es guardar la imagen que el administrador exporta de su aplicación bancaria.
 */
export const savePaymentQr =
  (deps: Deps & { admin: AdminRepository; storage: FileStore; newKey: () => string }) =>
  async (
    actor: Actor,
    input: { bytes: Uint8Array; mime: string },
  ): Promise<Result<null, AdminError>> =>
    attempt(
      async () => {
        const key = deps.newKey()
        await deps.storage.put(key, input.bytes)
        await deps.settings.write({ [PAYMENT_KEYS.qrImage]: `${key}.${input.mime.replace('image/', '')}` })

        await deps.admin.record({
          actorUserId: actor.userId,
          actorEmail: actor.email,
          action: 'pagos.qr',
        })

        return ok(null)
      },
      (cause) => adminError('storage_failure', `No se pudo guardar el QR: ${String(cause)}`),
    )
