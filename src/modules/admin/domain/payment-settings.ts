/**
 * Los datos de cobro del Plan B: lo que ve quien acaba de hacer un pedido.
 *
 * Viven en la base y no en el código porque un número de cuenta cambia sin que cambie el
 * producto, y cambiarlo no puede exigir un despliegue.
 *
 * **No son datos de cada atelier.** Los pedidos del Plan B compran planes de
 * Luxury Atelier: ese dinero va a una sola cuenta, la del administrador. Si algún día un
 * atelier cobrara por su cuenta, sería otra cosa y otra tabla.
 */
export type PaymentSettings = {
  readonly bank: string
  readonly accountHolder: string
  readonly accountNumber: string
  /** Notas para quien transfiere: horario, aviso por WhatsApp, lo que haga falta. */
  readonly notes: string
  /** Si hay imagen del QR cargada. La imagen la sirve su propia ruta, no esta cadena. */
  readonly hasQrImage: boolean
}

export const PAYMENT_KEYS = {
  bank: 'payment.bank',
  accountHolder: 'payment.accountHolder',
  accountNumber: 'payment.accountNumber',
  notes: 'payment.notes',
  qrImage: 'payment.qrImageKey',
} as const

export const EMPTY_PAYMENT_SETTINGS: PaymentSettings = {
  bank: '',
  accountHolder: '',
  accountNumber: '',
  notes: '',
  hasQrImage: false,
}

/**
 * Sin banco, titular y cuenta **no se enseña nada**.
 *
 * Media ficha de transferencia es peor que ninguna: quien la ve cree que puede pagar, y
 * descubre que no cuando ya escribió al atelier. La pantalla del pedido dice entonces que
 * los datos se piden por WhatsApp, que es la verdad.
 */
export function isPayable(settings: PaymentSettings): boolean {
  return (
    settings.bank.trim() !== '' && settings.accountHolder.trim() !== '' && settings.accountNumber.trim() !== ''
  )
}
